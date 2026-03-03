import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';
export const SUPABASE_ADMIN_CLIENT = 'SUPABASE_ADMIN_CLIENT';

@Global()
@Module({
    providers: [
        {
            provide: SUPABASE_CLIENT,
            useFactory: (config: ConfigService) =>
                createClient(
                    config.getOrThrow('SUPABASE_URL'),
                    config.getOrThrow('SUPABASE_ANON_KEY'),
                ),
            inject: [ConfigService],
        },
        {
            provide: SUPABASE_ADMIN_CLIENT,
            useFactory: (config: ConfigService) =>
                createClient(
                    config.getOrThrow('SUPABASE_URL'),
                    config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
                    { auth: { autoRefreshToken: false, persistSession: false } },
                ),
            inject: [ConfigService],
        },
    ],
    exports: [SUPABASE_CLIENT, SUPABASE_ADMIN_CLIENT],
})
export class SupabaseModule { }
