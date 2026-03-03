import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN_CLIENT } from '../supabase/supabase.module';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class ResultsService {
    private readonly encryptionKey: string;

    constructor(
        @Inject(SUPABASE_ADMIN_CLIENT) private readonly supabase: SupabaseClient,
        private readonly config: ConfigService,
    ) {
        this.encryptionKey = this.config.get('VOTE_ENCRYPTION_KEY', 'votesphere-default-encrypt-key-32b!');
    }

    // ── Tally Computation ───────────────────────────────────

    async computeResults(electionId: string) {
        const { data: election } = await this.supabase
            .from('elections')
            .select('*')
            .eq('id', electionId)
            .single();

        if (!election) throw new NotFoundException('Election not found');

        // Get all votes
        const { data: votes } = await this.supabase
            .from('votes')
            .select('encrypted_payload, normalized_selections')
            .eq('election_id', electionId);

        if (!votes || votes.length === 0) return { positions: [], total_votes: 0, quorum_met: false };

        // Get positions/candidates
        const { data: positions } = await this.supabase
            .from('positions')
            .select('id, title, max_selections, candidates(id, display_name)')
            .eq('election_id', electionId)
            .order('sort_order', { ascending: true });

        // Decrypt and tally
        const allSelections: any[] = [];
        for (const vote of votes) {
            if (vote.normalized_selections) {
                allSelections.push(...vote.normalized_selections);
            } else if (vote.encrypted_payload) {
                try {
                    const decrypted = this.decryptPayload(vote.encrypted_payload);
                    const parsed = JSON.parse(decrypted);
                    allSelections.push(...parsed);
                } catch { /* Skip corrupted votes */ }
            }
        }

        // Build tally per position
        const results = (positions || []).map(pos => {
            const candidates = (pos.candidates || []).map((c: any) => {
                const candidateVotes = allSelections.filter(s => s.candidate_id === c.id);

                let tally: any = { id: c.id, display_name: c.display_name, votes: candidateVotes.length };

                // Method-specific tallies
                if (election.voting_method === 'ranked_choice') {
                    const ranks: number[] = candidateVotes.map((v: any) => v.rank).filter(Boolean);
                    tally.avg_rank = ranks.length > 0 ? (ranks.reduce((a: number, b: number) => a + b, 0) / ranks.length).toFixed(2) : null;
                }
                if (election.voting_method === 'score') {
                    const scores: number[] = candidateVotes.map((v: any) => v.score).filter(Boolean);
                    tally.avg_score = scores.length > 0 ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(2) : null;
                    tally.total_score = scores.reduce((a: number, b: number) => a + b, 0);
                }
                if (election.voting_method === 'weighted') {
                    const weights: number[] = candidateVotes.map((v: any) => v.weight || 1);
                    tally.weighted_total = weights.reduce((a: number, b: number) => a + b, 0);
                }

                return tally;
            });

            // Sort candidates by votes desc (or avg_rank asc for ranked)
            if (election.voting_method === 'ranked_choice') {
                candidates.sort((a: any, b: any) => (a.avg_rank || 999) - (b.avg_rank || 999));
            } else if (election.voting_method === 'score') {
                candidates.sort((a: any, b: any) => (b.total_score || 0) - (a.total_score || 0));
            } else {
                candidates.sort((a: any, b: any) => b.votes - a.votes);
            }

            return { position_id: pos.id, position_title: pos.title, candidates };
        });

        // Turnout / quorum check
        const { data: registry } = await this.supabase
            .from('voter_registry')
            .select('id', { count: 'exact' })
            .eq('election_id', electionId);

        const totalRegistered = registry?.length || 0;
        const totalVoted = votes.length;
        const turnoutPercent = totalRegistered > 0 ? Math.round((totalVoted / totalRegistered) * 100) : 0;
        const quorumMet = !election.quorum_percent || turnoutPercent >= election.quorum_percent;

        return {
            positions: results,
            total_votes: totalVoted,
            total_registered: totalRegistered,
            turnout_percent: turnoutPercent,
            quorum_required: election.quorum_percent || 0,
            quorum_met: quorumMet,
            voting_method: election.voting_method,
        };
    }

    // ── Result Visibility Enforcement ───────────────────────

    async getResults(userId: string, electionId: string) {
        const { data: election } = await this.supabase
            .from('elections')
            .select('*, organizations(id)')
            .eq('id', electionId)
            .single();

        if (!election) throw new NotFoundException('Election not found');

        // Check visibility
        const canView = await this.canViewResults(userId, election);
        if (!canView) {
            throw new ForbiddenException('Results are not yet available for this election');
        }

        return this.computeResults(electionId);
    }

    async releaseResults(userId: string, electionId: string) {
        const { data: election } = await this.supabase
            .from('elections')
            .select('*')
            .eq('id', electionId)
            .single();

        if (!election) throw new NotFoundException('Election not found');

        // Save results snapshot
        const results = await this.computeResults(electionId);

        await this.supabase
            .from('elections')
            .update({ results_json: results, results_released_at: new Date().toISOString() })
            .eq('id', electionId);

        await this.supabase.from('audit_logs').insert({
            election_id: electionId,
            actor_id: userId,
            action: 'results_released',
            meta: { turnout: results.turnout_percent, quorum_met: results.quorum_met },
        });

        return results;
    }

    // ── CSV Export ───────────────────────────────────────────

    async exportCSV(electionId: string) {
        const results = await this.computeResults(electionId);
        let csv = 'Position,Candidate,Votes,Percentage\n';

        for (const pos of results.positions) {
            for (const cand of pos.candidates) {
                const pct = results.total_votes > 0 ? ((cand.votes / results.total_votes) * 100).toFixed(1) : '0.0';
                csv += `"${pos.position_title}","${cand.display_name}",${cand.votes},${pct}%\n`;
            }
        }

        csv += `\nTotal Votes,${results.total_votes}\n`;
        csv += `Turnout,${results.turnout_percent}%\n`;
        csv += `Quorum Met,${results.quorum_met ? 'Yes' : 'No'}\n`;

        return csv;
    }

    // ── Turnout by Segment ──────────────────────────────────

    async getTurnoutBySegment(electionId: string) {
        const { data: election } = await this.supabase
            .from('elections')
            .select('org_id')
            .eq('id', electionId)
            .single();

        if (!election) throw new NotFoundException('Election not found');

        // Get all registered voters with their org_member department
        const { data: registry } = await this.supabase
            .from('voter_registry')
            .select('user_id, has_voted, org_members(department)')
            .eq('election_id', electionId);

        if (!registry) return [];

        // Group by department
        const segments = new Map<string, { total: number; voted: number }>();
        for (const r of registry) {
            const dept = (r as any).org_members?.department || 'Unassigned';
            if (!segments.has(dept)) segments.set(dept, { total: 0, voted: 0 });
            const seg = segments.get(dept)!;
            seg.total++;
            if (r.has_voted) seg.voted++;
        }

        return Array.from(segments.entries()).map(([department, data]) => ({
            department,
            total: data.total,
            voted: data.voted,
            turnout_percent: data.total > 0 ? Math.round((data.voted / data.total) * 100) : 0,
        }));
    }

    // ── Private Helpers ─────────────────────────────────────

    private async canViewResults(userId: string, election: any): Promise<boolean> {
        if (election.result_visibility === 'realtime') return true;

        if (election.result_visibility === 'after_close') {
            return ['closed', 'archived'].includes(election.status);
        }

        if (election.result_visibility === 'manual_release') {
            return !!election.results_released_at;
        }

        if (election.result_visibility === 'admin_only') {
            const { data } = await this.supabase
                .from('org_members')
                .select('role')
                .eq('user_id', userId)
                .eq('org_id', election.org_id)
                .eq('is_active', true)
                .single();
            return data?.role === 'org_admin';
        }

        return false;
    }

    private decryptPayload(encrypted: string): string {
        const [ivHex, encData] = encrypted.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const key = crypto.scryptSync(this.encryptionKey, 'votesphere-salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
