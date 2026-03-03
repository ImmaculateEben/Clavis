import { Injectable, Inject, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN_CLIENT } from '../supabase/supabase.module';
import { ConfigService } from '@nestjs/config';
import { CastVoteDto, AssignProxyDto } from './dto/voting.dto';
import * as crypto from 'crypto';

@Injectable()
export class VotingService {
    private readonly encryptionKey: string;
    private readonly hmacSecret: string;

    constructor(
        @Inject(SUPABASE_ADMIN_CLIENT) private readonly supabase: SupabaseClient,
        private readonly config: ConfigService,
    ) {
        this.encryptionKey = this.config.get('VOTE_ENCRYPTION_KEY', 'votesphere-default-encrypt-key-32b!');
        this.hmacSecret = this.config.get('VOTER_HMAC_SECRET', 'votesphere-default-hmac-secret-key');
    }

    // ── Cast Vote (main RPC) ────────────────────────────────

    async castVote(userId: string, dto: CastVoteDto) {
        // 1. Load election
        const { data: election, error: elErr } = await this.supabase
            .from('elections')
            .select('*')
            .eq('id', dto.election_id)
            .single();

        if (elErr || !election) throw new BadRequestException('Election not found');
        if (election.status !== 'open') throw new BadRequestException('Election is not open for voting');

        // 2. Determine actual voter (proxy support)
        const actualVoterId = dto.proxy_for_user_id || userId;

        if (dto.proxy_for_user_id) {
            await this.assertProxy(userId, dto.proxy_for_user_id, dto.election_id);
        }

        // 3. Check eligibility (voter registry)
        const { data: registry } = await this.supabase
            .from('voter_registry')
            .select('id, is_eligible, has_voted')
            .eq('election_id', dto.election_id)
            .eq('user_id', actualVoterId)
            .single();

        if (!registry) throw new ForbiddenException('You are not registered to vote in this election');
        if (!registry.is_eligible) throw new ForbiddenException('You are not eligible to vote');

        // 4. Deduplication check
        const voterHash = this.generateVoterHash(actualVoterId, dto.election_id);

        if (registry.has_voted) {
            throw new ConflictException('You have already voted in this election');
        }

        // Double-check via voter_hash in votes table
        const { data: existingVote } = await this.supabase
            .from('votes')
            .select('id')
            .eq('election_id', dto.election_id)
            .eq('voter_hash', voterHash)
            .maybeSingle();

        if (existingVote) throw new ConflictException('Duplicate vote detected');

        // 5. Validate selections against positions
        await this.validateSelections(dto.election_id, dto.selections);

        // 6. Encrypt vote payload
        const encryptedPayload = this.encryptPayload(JSON.stringify(dto.selections));

        // 7. Generate receipt code
        const receiptCode = this.generateReceiptCode();

        // 8. Build vote record based on anonymity level
        const voteRecord: any = {
            election_id: dto.election_id,
            voter_hash: voterHash,
            encrypted_payload: encryptedPayload,
            receipt_code: receiptCode,
            device_hash: dto.device_hash || null,
            cast_at: new Date().toISOString(),
        };

        // Anonymity-specific fields
        if (election.anonymity_level === 'anonymous') {
            // No registry_id stored — fully anonymous
        } else if (election.anonymity_level === 'hybrid') {
            voteRecord.registry_id = registry.id;
            // Ballot remains encrypted
        } else if (election.anonymity_level === 'transparent') {
            voteRecord.registry_id = registry.id;
            // Store normalized (unencrypted) selections
            voteRecord.normalized_selections = dto.selections;
        }

        // 9. Insert vote
        const { error: voteErr } = await this.supabase
            .from('votes')
            .insert(voteRecord);

        if (voteErr) throw new Error(voteErr.message);

        // 10. Mark voter as having voted
        await this.supabase
            .from('voter_registry')
            .update({ has_voted: true })
            .eq('id', registry.id);

        // 11. Audit log
        await this.supabase.from('audit_logs').insert({
            election_id: dto.election_id,
            actor_id: userId,
            action: 'vote_cast',
            meta: {
                anonymity: election.anonymity_level,
                proxy: dto.proxy_for_user_id ? true : false,
                device_hash: dto.device_hash,
            },
        });

        return {
            success: true,
            receipt_code: receiptCode,
            message: 'Your vote has been recorded securely.',
        };
    }

    // ── Receipt Verification ────────────────────────────────

    async verifyReceipt(receiptCode: string) {
        const { data, error } = await this.supabase
            .from('votes')
            .select('id, election_id, cast_at, elections(title, status)')
            .eq('receipt_code', receiptCode)
            .maybeSingle();

        if (error || !data) {
            return { valid: false, message: 'Receipt code not found' };
        }

        return {
            valid: true,
            election_title: (data.elections as any)?.title,
            cast_at: data.cast_at,
            election_status: (data.elections as any)?.status,
        };
    }

    // ── Proxy Voting ────────────────────────────────────────

    async assignProxy(userId: string, dto: AssignProxyDto) {
        // The actual voter (userId) assigns someone (proxy_user_id) to vote on their behalf
        const { error } = await this.supabase
            .from('proxy_assignments')
            .insert({
                election_id: dto.election_id,
                voter_user_id: userId,
                proxy_user_id: dto.proxy_user_id,
                is_active: true,
            });

        if (error) {
            if (error.code === '23505') throw new ConflictException('Proxy already assigned for this election');
            throw new Error(error.message);
        }

        await this.supabase.from('audit_logs').insert({
            election_id: dto.election_id,
            actor_id: userId,
            action: 'proxy_assigned',
            meta: { proxy_user_id: dto.proxy_user_id },
        });

        return { success: true };
    }

    async getMyProxies(userId: string, electionId: string) {
        const { data, error } = await this.supabase
            .from('proxy_assignments')
            .select('*, profiles!proxy_assignments_voter_user_id_fkey(full_name, email)')
            .eq('election_id', electionId)
            .eq('proxy_user_id', userId)
            .eq('is_active', true);

        if (error) throw new Error(error.message);
        return data;
    }

    // ── Turnout Stats ───────────────────────────────────────

    async getTurnout(electionId: string) {
        const { data: total } = await this.supabase
            .from('voter_registry')
            .select('id', { count: 'exact' })
            .eq('election_id', electionId);

        const { data: voted } = await this.supabase
            .from('voter_registry')
            .select('id', { count: 'exact' })
            .eq('election_id', electionId)
            .eq('has_voted', true);

        const totalCount = total?.length || 0;
        const votedCount = voted?.length || 0;

        return {
            total_registered: totalCount,
            total_voted: votedCount,
            turnout_percent: totalCount > 0 ? Math.round((votedCount / totalCount) * 100) : 0,
        };
    }

    // ── Private Helpers ─────────────────────────────────────

    private generateVoterHash(userId: string, electionId: string): string {
        return crypto
            .createHmac('sha256', this.hmacSecret)
            .update(`${userId}:${electionId}`)
            .digest('hex');
    }

    private encryptPayload(plaintext: string): string {
        const iv = crypto.randomBytes(16);
        const key = crypto.scryptSync(this.encryptionKey, 'votesphere-salt', 32);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    private generateReceiptCode(): string {
        return crypto.randomBytes(16).toString('hex').toUpperCase();
    }

    private async validateSelections(electionId: string, selections: any[]) {
        const { data: positions } = await this.supabase
            .from('positions')
            .select('id, max_selections')
            .eq('election_id', electionId);

        if (!positions) throw new BadRequestException('No positions found');

        // Group selections by position
        const byPosition = new Map<string, number>();
        for (const sel of selections) {
            byPosition.set(sel.position_id, (byPosition.get(sel.position_id) || 0) + 1);
        }

        // Validate max selections per position
        for (const pos of positions) {
            const count = byPosition.get(pos.id) || 0;
            if (count > pos.max_selections) {
                throw new BadRequestException(`Position allows max ${pos.max_selections} selection(s), got ${count}`);
            }
        }
    }

    private async assertProxy(proxyUserId: string, voterUserId: string, electionId: string) {
        const { data, error } = await this.supabase
            .from('proxy_assignments')
            .select('id')
            .eq('election_id', electionId)
            .eq('voter_user_id', voterUserId)
            .eq('proxy_user_id', proxyUserId)
            .eq('is_active', true)
            .maybeSingle();

        if (error || !data) {
            throw new ForbiddenException('You are not authorized to vote on behalf of this user');
        }
    }
}
