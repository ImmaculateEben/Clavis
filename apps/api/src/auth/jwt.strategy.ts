import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN_CLIENT } from '../supabase/supabase.module';

export interface JwtPayload {
    sub: string; // user UUID from Supabase Auth
    email: string;
    role: string; // Supabase role
    iat: number;
    exp: number;
}

export interface AuthenticatedUser {
    id: string;
    email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        config: ConfigService,
        @Inject(SUPABASE_ADMIN_CLIENT) private readonly supabase: SupabaseClient,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: config.getOrThrow('SUPABASE_JWT_SECRET'),
        });
    }

    async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
        if (!payload.sub) throw new UnauthorizedException();
        return { id: payload.sub, email: payload.email };
    }
}
