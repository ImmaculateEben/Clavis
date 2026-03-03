import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { OrgsModule } from './orgs/orgs.module';
import { ElectionsModule } from './elections/elections.module';
import { VotingModule } from './voting/voting.module';
import { ResultsModule } from './results/results.module';
import { AuditModule } from './audit/audit.module';
import { JobsModule } from './jobs/jobs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AppController } from './app.controller';

@Module({
    imports: [
        // Config: load .env
        ConfigModule.forRoot({ isGlobal: true }),

        // Rate limiting: global default
        ThrottlerModule.forRoot([
            {
                name: 'short',
                ttl: 10000, // 10 seconds
                limit: 20,
            },
            {
                name: 'long',
                ttl: 60000, // 1 minute
                limit: 100,
            },
        ]),

        // Cron jobs
        ScheduleModule.forRoot(),

        // Supabase client
        SupabaseModule,

        // Feature modules
        AuthModule,
        OrgsModule,
        ElectionsModule,
        VotingModule,
        ResultsModule,
        AuditModule,
        JobsModule,
        NotificationsModule,
    ],
    controllers: [AppController],
})
export class AppModule { }
