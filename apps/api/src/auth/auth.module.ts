import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
    imports: [PassportModule],
    providers: [
        JwtStrategy,
        // Apply JwtAuthGuard globally — use @Public() decorator to opt out
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
    ],
    exports: [JwtStrategy],
})
export class AuthModule { }
