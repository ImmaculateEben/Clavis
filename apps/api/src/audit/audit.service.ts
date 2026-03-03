import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN_CLIENT } from '../supabase/supabase.module';

@Injectable()
export class AuditService {
    constructor(
        @Inject(SUPABASE_ADMIN_CLIENT) private readonly supabase: SupabaseClient,
    ) { }

    async getElectionAuditLog(electionId: string, limit = 100) {
        const { data, error } = await this.supabase
            .from('audit_logs')
            .select('*, profiles(full_name, email)')
            .eq('election_id', electionId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw new Error(error.message);
        return data.map(log => ({
            id: log.id,
            action: log.action,
            meta: log.meta,
            created_at: log.created_at,
            actor_name: (log.profiles as any)?.full_name || 'System',
            actor_email: (log.profiles as any)?.email || '',
        }));
    }

    async getOrgAuditLog(orgId: string, limit = 100) {
        // Get all election IDs for this org
        const { data: elections } = await this.supabase
            .from('elections')
            .select('id')
            .eq('org_id', orgId);

        if (!elections || elections.length === 0) return [];

        const electionIds = elections.map(e => e.id);

        const { data, error } = await this.supabase
            .from('audit_logs')
            .select('*, profiles(full_name, email), elections(title)')
            .in('election_id', electionIds)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw new Error(error.message);
        return data.map(log => ({
            id: log.id,
            action: log.action,
            meta: log.meta,
            created_at: log.created_at,
            election_title: (log.elections as any)?.title || '',
            actor_name: (log.profiles as any)?.full_name || 'System',
        }));
    }

    async log(electionId: string, actorId: string, action: string, meta?: any) {
        await this.supabase.from('audit_logs').insert({
            election_id: electionId,
            actor_id: actorId,
            action,
            meta: meta || {},
        });
    }
}
