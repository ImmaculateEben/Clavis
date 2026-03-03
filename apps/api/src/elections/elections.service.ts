import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN_CLIENT } from '../supabase/supabase.module';
import { CreateElectionDto, UpdateElectionDto, CreatePositionDto, CreateCandidateDto } from './dto/election.dto';

// Valid state transitions
const STATE_TRANSITIONS: Record<string, string[]> = {
    draft: ['scheduled', 'open'],       // Can skip scheduled if immediate
    scheduled: ['open', 'draft'],       // Can revert to draft
    open: ['closed'],                   // Can only close
    closed: ['archived'],               // Can only archive
    archived: [],                       // Terminal state
};

@Injectable()
export class ElectionsService {
    constructor(
        @Inject(SUPABASE_ADMIN_CLIENT) private readonly supabase: SupabaseClient,
    ) { }

    // ── Election CRUD ────────────────────────────────────────

    async create(userId: string, dto: CreateElectionDto) {
        // Verify user is admin or election_officer in the org
        await this.assertElectionOfficer(userId, dto.org_id);

        const { data, error } = await this.supabase
            .from('elections')
            .insert({
                org_id: dto.org_id,
                title: dto.title,
                description: dto.description,
                voting_method: dto.voting_method,
                anonymity_level: dto.anonymity_level,
                result_visibility: dto.result_visibility,
                start_at: dto.start_at,
                end_at: dto.end_at,
                quorum_percent: dto.quorum_percent,
                allow_proxy_voting: dto.allow_proxy_voting ?? false,
                status: 'draft',
                created_by: userId,
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async findByOrg(orgId: string) {
        const { data, error } = await this.supabase
            .from('elections')
            .select('*')
            .eq('org_id', orgId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data;
    }

    async findById(id: string) {
        const { data, error } = await this.supabase
            .from('elections')
            .select('*, organizations(name, slug)')
            .eq('id', id)
            .single();

        if (error || !data) throw new NotFoundException('Election not found');
        return data;
    }

    async update(userId: string, electionId: string, dto: UpdateElectionDto) {
        const election = await this.findById(electionId);
        if (election.status !== 'draft') {
            throw new BadRequestException('Can only edit elections in draft state');
        }
        await this.assertElectionOfficer(userId, election.org_id);

        const { data, error } = await this.supabase
            .from('elections')
            .update(dto)
            .eq('id', electionId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    // ── State Machine ────────────────────────────────────────

    async transition(userId: string, electionId: string, targetState: string) {
        const election = await this.findById(electionId);
        await this.assertElectionOfficer(userId, election.org_id);

        const allowed = STATE_TRANSITIONS[election.status] || [];
        if (!allowed.includes(targetState)) {
            throw new BadRequestException(
                `Cannot transition from "${election.status}" to "${targetState}". Allowed: ${allowed.join(', ') || 'none (terminal state)'}`,
            );
        }

        // If opening, validate requirements
        if (targetState === 'open') {
            const { data: positions } = await this.supabase
                .from('positions')
                .select('id')
                .eq('election_id', electionId);

            if (!positions || positions.length === 0) {
                throw new BadRequestException('Election must have at least one position before opening');
            }

            const { data: candidates } = await this.supabase
                .from('candidates')
                .select('id')
                .eq('election_id', electionId)
                .eq('is_approved', true);

            if (!candidates || candidates.length === 0) {
                throw new BadRequestException('Election must have at least one approved candidate');
            }
        }

        const updates: any = { status: targetState };
        if (targetState === 'open' && !election.start_at) updates.start_at = new Date().toISOString();
        if (targetState === 'closed' && !election.end_at) updates.end_at = new Date().toISOString();

        const { data, error } = await this.supabase
            .from('elections')
            .update(updates)
            .eq('id', electionId)
            .select()
            .single();

        if (error) throw new Error(error.message);

        // Log audit event
        await this.supabase.from('audit_logs').insert({
            election_id: electionId,
            actor_id: userId,
            action: `election_${targetState}`,
            meta: { from: election.status, to: targetState },
        });

        return data;
    }

    // ── Positions ────────────────────────────────────────────

    async createPosition(userId: string, electionId: string, dto: CreatePositionDto) {
        const election = await this.findById(electionId);
        await this.assertElectionOfficer(userId, election.org_id);

        if (election.status !== 'draft') {
            throw new BadRequestException('Positions can only be added in draft state');
        }

        const { data, error } = await this.supabase
            .from('positions')
            .insert({
                election_id: electionId,
                title: dto.title,
                description: dto.description,
                max_selections: dto.max_selections ?? 1,
                sort_order: dto.sort_order ?? 0,
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async getPositions(electionId: string) {
        const { data, error } = await this.supabase
            .from('positions')
            .select('*, candidates(*)')
            .eq('election_id', electionId)
            .order('sort_order', { ascending: true });

        if (error) throw new Error(error.message);
        return data;
    }

    // ── Candidates ───────────────────────────────────────────

    async addCandidate(userId: string, electionId: string, dto: CreateCandidateDto) {
        const election = await this.findById(electionId);
        await this.assertElectionOfficer(userId, election.org_id);

        const { data, error } = await this.supabase
            .from('candidates')
            .insert({
                election_id: electionId,
                position_id: dto.position_id,
                user_id: dto.user_id,
                display_name: dto.display_name,
                manifesto: dto.manifesto,
                photo_url: dto.photo_url,
                campaign_video_url: dto.campaign_video_url,
                is_approved: true, // Auto-approve for non-council orgs
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async approveCandidate(userId: string, electionId: string, candidateId: string, approved: boolean) {
        const election = await this.findById(electionId);
        await this.assertElectionOfficer(userId, election.org_id);

        const { error } = await this.supabase
            .from('candidates')
            .update({ is_approved: approved })
            .eq('id', candidateId)
            .eq('election_id', electionId);

        if (error) throw new Error(error.message);
    }

    // ── Voter Registry ───────────────────────────────────────

    async getRegistry(electionId: string) {
        const { data, error } = await this.supabase
            .from('voter_registry')
            .select('*, profiles(full_name, email)')
            .eq('election_id', electionId)
            .order('created_at', { ascending: true });

        if (error) throw new Error(error.message);
        return data;
    }

    async registerVoters(userId: string, electionId: string, userIds: string[]) {
        const election = await this.findById(electionId);
        await this.assertElectionOfficer(userId, election.org_id);

        const rows = userIds.map(uid => ({
            election_id: electionId,
            user_id: uid,
            is_eligible: true,
        }));

        const { data, error } = await this.supabase
            .from('voter_registry')
            .upsert(rows, { onConflict: 'election_id,user_id' })
            .select();

        if (error) throw new Error(error.message);
        return data;
    }

    async autoRegisterFromOrg(userId: string, electionId: string) {
        const election = await this.findById(electionId);
        await this.assertElectionOfficer(userId, election.org_id);

        // Get all active org members
        const { data: members, error } = await this.supabase
            .from('org_members')
            .select('user_id')
            .eq('org_id', election.org_id)
            .eq('is_active', true);

        if (error) throw new Error(error.message);
        if (!members || members.length === 0) throw new BadRequestException('No active members in org');

        return this.registerVoters(userId, electionId, members.map(m => m.user_id));
    }

    // ── Helpers ──────────────────────────────────────────────

    private async assertElectionOfficer(userId: string, orgId: string): Promise<void> {
        const { data, error } = await this.supabase
            .from('org_members')
            .select('role')
            .eq('user_id', userId)
            .eq('org_id', orgId)
            .eq('is_active', true)
            .single();

        if (error || !data || !['org_admin', 'election_officer'].includes(data.role)) {
            throw new ForbiddenException('Only org admins or election officers can manage elections');
        }
    }
}
