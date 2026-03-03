import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { VotingService } from './voting.service';
import { CastVoteDto, VerifyReceiptDto, AssignProxyDto } from './dto/voting.dto';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';

@Controller('voting')
export class VotingController {
    constructor(private readonly voting: VotingService) { }

    @Post('cast')
    castVote(@CurrentUser() user: AuthenticatedUser, @Body() dto: CastVoteDto) {
        return this.voting.castVote(user.id, dto);
    }

    @Public()
    @Post('verify-receipt')
    verifyReceipt(@Body() dto: VerifyReceiptDto) {
        return this.voting.verifyReceipt(dto.receipt_code);
    }

    @Get('turnout/:electionId')
    getTurnout(@Param('electionId') electionId: string) {
        return this.voting.getTurnout(electionId);
    }

    @Post('proxy')
    assignProxy(@CurrentUser() user: AuthenticatedUser, @Body() dto: AssignProxyDto) {
        return this.voting.assignProxy(user.id, dto);
    }

    @Get('proxy/:electionId')
    getMyProxies(@CurrentUser() user: AuthenticatedUser, @Param('electionId') electionId: string) {
        return this.voting.getMyProxies(user.id, electionId);
    }
}
