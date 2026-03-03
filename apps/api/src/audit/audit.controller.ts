import { Controller, Get, Param, Query } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
    constructor(private readonly audit: AuditService) { }

    @Get('election/:electionId')
    getElectionLogs(
        @Param('electionId') electionId: string,
        @Query('limit') limit?: string,
    ) {
        return this.audit.getElectionAuditLog(electionId, limit ? parseInt(limit) : 100);
    }

    @Get('org/:orgId')
    getOrgLogs(
        @Param('orgId') orgId: string,
        @Query('limit') limit?: string,
    ) {
        return this.audit.getOrgAuditLog(orgId, limit ? parseInt(limit) : 100);
    }
}
