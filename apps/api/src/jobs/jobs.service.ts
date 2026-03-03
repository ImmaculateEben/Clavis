import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN_CLIENT } from '../supabase/supabase.module';

@Injectable()
export class JobsService {
    private readonly logger = new Logger(JobsService.name);

    constructor(
        @Inject(SUPABASE_ADMIN_CLIENT) private readonly supabase: SupabaseClient,
    ) { }

    // Auto-open scheduled elections when start_at has passed
    @Cron(CronExpression.EVERY_MINUTE)
    async autoOpenElections() {
        const now = new Date().toISOString();

        const { data: elections, error } = await this.supabase
            .from('elections')
            .select('id, title')
            .eq('status', 'scheduled')
            .lte('start_at', now);

        if (error || !elections) return;

        for (const election of elections) {
            await this.supabase
                .from('elections')
                .update({ status: 'open' })
                .eq('id', election.id);

            await this.supabase.from('audit_logs').insert({
                election_id: election.id,
                action: 'election_auto_opened',
                meta: { triggered_at: now },
            });

            this.logger.log(`Auto-opened election: ${election.title}`);
        }
    }

    // Auto-close elections when end_at has passed
    @Cron(CronExpression.EVERY_MINUTE)
    async autoCloseElections() {
        const now = new Date().toISOString();

        const { data: elections, error } = await this.supabase
            .from('elections')
            .select('id, title')
            .eq('status', 'open')
            .not('end_at', 'is', null)
            .lte('end_at', now);

        if (error || !elections) return;

        for (const election of elections) {
            await this.supabase
                .from('elections')
                .update({ status: 'closed' })
                .eq('id', election.id);

            await this.supabase.from('audit_logs').insert({
                election_id: election.id,
                action: 'election_auto_closed',
                meta: { triggered_at: now },
            });

            this.logger.log(`Auto-closed election: ${election.title}`);
        }
    }

    // Cleanup expired proxy assignments
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async cleanupProxies() {
        // Deactivate proxies for closed/archived elections
        const { data: closedElections } = await this.supabase
            .from('elections')
            .select('id')
            .in('status', ['closed', 'archived']);

        if (!closedElections || closedElections.length === 0) return;

        await this.supabase
            .from('proxy_assignments')
            .update({ is_active: false })
            .in('election_id', closedElections.map(e => e.id))
            .eq('is_active', true);

        this.logger.log(`Cleaned up proxies for ${closedElections.length} closed elections`);
    }
}
