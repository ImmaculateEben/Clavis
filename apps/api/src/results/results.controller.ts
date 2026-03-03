import { Controller, Get, Post, Param, Res } from '@nestjs/common';
import { ResultsService } from './results.service';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { Response } from 'express';

@Controller('results')
export class ResultsController {
    constructor(private readonly results: ResultsService) { }

    @Get(':electionId')
    getResults(@CurrentUser() user: AuthenticatedUser, @Param('electionId') id: string) {
        return this.results.getResults(user.id, id);
    }

    @Post(':electionId/release')
    releaseResults(@CurrentUser() user: AuthenticatedUser, @Param('electionId') id: string) {
        return this.results.releaseResults(user.id, id);
    }

    @Get(':electionId/csv')
    async exportCSV(@Param('electionId') id: string, @Res() res: Response) {
        const csv = await this.results.exportCSV(id);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=results-${id}.csv`);
        res.send(csv);
    }

    @Get(':electionId/segments')
    getTurnoutBySegment(@Param('electionId') id: string) {
        return this.results.getTurnoutBySegment(id);
    }

    // Observer portal — public read-only results
    @Public()
    @Get(':electionId/public')
    async getPublicResults(@Param('electionId') id: string) {
        return this.results.computeResults(id);
    }
}
