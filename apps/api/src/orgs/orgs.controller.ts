import { Controller, Post, Get, Patch, Delete, Body, Param } from '@nestjs/common';
import { OrgsService } from './orgs.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('orgs')
export class OrgsController {
    constructor(private readonly orgsService: OrgsService) { }

    @Post()
    async createOrg(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: CreateOrgDto,
    ) {
        return this.orgsService.createOrg(user.id, dto);
    }

    @Get()
    async getOrgs(@CurrentUser() user: AuthenticatedUser) {
        return this.orgsService.getOrgsForUser(user.id);
    }

    @Get(':id')
    async getOrgById(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') orgId: string,
    ) {
        return this.orgsService.getOrgById(user.id, orgId);
    }

    // ── Members ──────────────────────────────────────────────

    @Get(':id/members')
    async getMembers(@Param('id') orgId: string) {
        return this.orgsService.getMembers(orgId);
    }

    @Post(':id/members')
    async inviteMember(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') orgId: string,
        @Body() dto: InviteMemberDto,
    ) {
        await this.orgsService.inviteMember(user.id, orgId, dto);
        return { success: true, message: 'Member invited successfully.' };
    }

    @Post(':id/members/bulk')
    async bulkImport(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') orgId: string,
        @Body() body: { rows: { email: string; role: string }[] },
    ) {
        return this.orgsService.bulkImportMembers(user.id, orgId, body.rows);
    }

    @Patch(':id/members/:memberId/role')
    async updateRole(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') orgId: string,
        @Param('memberId') memberId: string,
        @Body() body: { role: string },
    ) {
        await this.orgsService.updateMemberRole(user.id, orgId, memberId, body.role);
        return { success: true };
    }

    @Delete(':id/members/:memberId')
    async removeMember(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') orgId: string,
        @Param('memberId') memberId: string,
    ) {
        await this.orgsService.removeMember(user.id, orgId, memberId);
        return { success: true };
    }
}
