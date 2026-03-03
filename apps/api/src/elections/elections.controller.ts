import { Controller, Post, Get, Patch, Body, Param } from '@nestjs/common';
import { ElectionsService } from './elections.service';
import { CreateElectionDto, UpdateElectionDto, TransitionElectionDto, CreatePositionDto, CreateCandidateDto } from './dto/election.dto';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';

@Controller('elections')
export class ElectionsController {
    constructor(private readonly elections: ElectionsService) { }

    // ── Election CRUD ────────────────────────────────────────

    @Post()
    create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateElectionDto) {
        return this.elections.create(user.id, dto);
    }

    @Get('org/:orgId')
    findByOrg(@Param('orgId') orgId: string) {
        return this.elections.findByOrg(orgId);
    }

    @Get(':id')
    findById(@Param('id') id: string) {
        return this.elections.findById(id);
    }

    @Patch(':id')
    update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateElectionDto) {
        return this.elections.update(user.id, id, dto);
    }

    // ── State Machine ────────────────────────────────────────

    @Post(':id/transition')
    transition(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') id: string,
        @Body() dto: TransitionElectionDto,
    ) {
        return this.elections.transition(user.id, id, dto.target_state);
    }

    // ── Positions ────────────────────────────────────────────

    @Get(':id/positions')
    getPositions(@Param('id') id: string) {
        return this.elections.getPositions(id);
    }

    @Post(':id/positions')
    createPosition(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') id: string,
        @Body() dto: CreatePositionDto,
    ) {
        return this.elections.createPosition(user.id, id, dto);
    }

    // ── Candidates ───────────────────────────────────────────

    @Post(':id/candidates')
    addCandidate(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') id: string,
        @Body() dto: CreateCandidateDto,
    ) {
        return this.elections.addCandidate(user.id, id, dto);
    }

    @Patch(':id/candidates/:candidateId/approve')
    approveCandidate(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') id: string,
        @Param('candidateId') candidateId: string,
        @Body() body: { approved: boolean },
    ) {
        return this.elections.approveCandidate(user.id, id, candidateId, body.approved);
    }

    // ── Voter Registry ───────────────────────────────────────

    @Get(':id/registry')
    getRegistry(@Param('id') id: string) {
        return this.elections.getRegistry(id);
    }

    @Post(':id/registry')
    registerVoters(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') id: string,
        @Body() body: { user_ids: string[] },
    ) {
        return this.elections.registerVoters(user.id, id, body.user_ids);
    }

    @Post(':id/registry/auto')
    autoRegister(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
        return this.elections.autoRegisterFromOrg(user.id, id);
    }
}
