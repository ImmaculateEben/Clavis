import { Injectable, Inject, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN_CLIENT } from '../supabase/supabase.module';
import { CreateOrgDto } from './dto/create-org.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { Organization, OrgMember } from '@votesphere/shared';

@Injectable()
export class OrgsService {
    constructor(
        @Inject(SUPABASE_ADMIN_CLIENT) private readonly supabase: SupabaseClient,
    ) { }

    async createOrg(userId: string, dto: CreateOrgDto): Promise<Organization> {
        const { data: org, error: orgError } = await this.supabase
            .from('organizations')
            .insert({
                name: dto.name,
                slug: dto.slug,
                logo_path: dto.logo_path,
                primary_color: dto.primary_color ?? '#6C63FF',
            })
            .select()
            .single();

        if (orgError) {
            if (orgError.code === '23505') throw new ConflictException('Organization slug already exists');
            throw new Error(orgError.message);
        }

        const { error: memberError } = await this.supabase
            .from('org_members')
            .insert({ org_id: org.id, user_id: userId, role: 'org_admin', is_active: true });

        if (memberError) throw new Error(memberError.message);
        return org as Organization;
    }

    async getOrgsForUser(userId: string): Promise<Organization[]> {
        const { data: members, error } = await this.supabase
            .from('org_members')
            .select('org_id, role, organizations(*)')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (error) throw new Error(error.message);
        return members.map(m => m.organizations as unknown as Organization).filter(Boolean);
    }

    async getOrgById(userId: string, orgId: string): Promise<Organization & { role: string }> {
        const { data, error } = await this.supabase
            .from('org_members')
            .select('role, organizations(*)')
            .eq('user_id', userId)
            .eq('org_id', orgId)
            .eq('is_active', true)
            .single();

        if (error || !data) throw new NotFoundException('Organization not found or access denied');
        return { ...(data.organizations as unknown as Organization), role: data.role };
    }

    // ── Members ──────────────────────────────────────────────

    async getMembers(orgId: string): Promise<any[]> {
        const { data, error } = await this.supabase
            .from('org_members')
            .select('id, user_id, role, department, membership_id, shareholder_weight, is_active, created_at, profiles(full_name, email, avatar_url)')
            .eq('org_id', orgId)
            .order('created_at', { ascending: true });

        if (error) throw new Error(error.message);
        return data.map(m => ({
            id: m.id,
            user_id: m.user_id,
            role: m.role,
            department: m.department,
            membership_id: m.membership_id,
            shareholder_weight: m.shareholder_weight,
            is_active: m.is_active,
            created_at: m.created_at,
            full_name: (m.profiles as any)?.full_name ?? 'Invited User',
            email: (m.profiles as any)?.email ?? '—',
            avatar_url: (m.profiles as any)?.avatar_url,
        }));
    }

    async updateMemberRole(actorId: string, orgId: string, memberId: string, newRole: string): Promise<void> {
        await this.assertOrgAdmin(actorId, orgId);

        const { error } = await this.supabase
            .from('org_members')
            .update({ role: newRole })
            .eq('id', memberId)
            .eq('org_id', orgId);

        if (error) throw new Error(error.message);
    }

    async removeMember(actorId: string, orgId: string, memberId: string): Promise<void> {
        await this.assertOrgAdmin(actorId, orgId);

        const { data: admins } = await this.supabase
            .from('org_members')
            .select('id')
            .eq('org_id', orgId)
            .eq('role', 'org_admin')
            .eq('is_active', true);

        const target = await this.supabase.from('org_members').select('user_id, role').eq('id', memberId).single();
        if (target.data?.role === 'org_admin' && admins && admins.length <= 1) {
            throw new BadRequestException('Cannot remove the last admin of an organization');
        }

        const { error } = await this.supabase
            .from('org_members')
            .update({ is_active: false })
            .eq('id', memberId)
            .eq('org_id', orgId);

        if (error) throw new Error(error.message);
    }

    async bulkImportMembers(actorId: string, orgId: string, rows: { email: string; role: string }[]): Promise<{ success: number; failed: { email: string; reason: string }[] }> {
        await this.assertOrgAdmin(actorId, orgId);

        const results = { success: 0, failed: [] as { email: string; reason: string }[] };

        for (const row of rows) {
            try {
                await this.inviteMember(actorId, orgId, { email: row.email, role: row.role as any });
                results.success++;
            } catch (err: any) {
                results.failed.push({ email: row.email, reason: err.message || 'Unknown error' });
            }
        }
        return results;
    }

    // ── Invite ───────────────────────────────────────────────

    async inviteMember(inviterId: string, orgId: string, dto: InviteMemberDto): Promise<void> {
        await this.assertOrgAdmin(inviterId, orgId);

        let targetUserId: string;

        const { data: authUser, error: inviteErr } = await this.supabase.auth.admin.inviteUserByEmail(dto.email);
        if (inviteErr && inviteErr.status !== 422) {
            throw new Error(inviteErr.message);
        }

        if (authUser && authUser.user) {
            targetUserId = authUser.user.id;
        } else {
            const { data: profile } = await this.supabase
                .from('profiles')
                .select('user_id')
                .eq('email', dto.email)
                .single();

            if (!profile) throw new ConflictException('User exists but profile is missing.');
            targetUserId = profile.user_id;
        }

        const { error: insertErr } = await this.supabase
            .from('org_members')
            .insert({
                org_id: orgId,
                user_id: targetUserId,
                role: dto.role,
                membership_id: dto.membership_id,
                branch_id: dto.branch_id,
                department: dto.department,
                shareholder_weight: dto.shareholder_weight || 1,
                is_active: true,
                invited_by: inviterId,
            });

        if (insertErr) {
            if (insertErr.code === '23505') throw new ConflictException('User is already a member');
            throw new Error(insertErr.message);
        }
    }

    // ── Helpers ──────────────────────────────────────────────

    private async assertOrgAdmin(userId: string, orgId: string): Promise<void> {
        const { data, error } = await this.supabase
            .from('org_members')
            .select('role')
            .eq('user_id', userId)
            .eq('org_id', orgId)
            .eq('is_active', true)
            .single();

        if (error || data?.role !== 'org_admin') {
            throw new ForbiddenException('Only org admins can perform this action');
        }
    }
}
