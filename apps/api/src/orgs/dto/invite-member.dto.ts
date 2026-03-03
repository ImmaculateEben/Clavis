import { IsString, IsNotEmpty, IsEmail, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { OrgRole } from '@votesphere/shared';

export class InviteMemberDto {
    @IsEmail()
    email: string;

    @IsEnum(['super_admin', 'org_admin', 'election_officer', 'observer', 'voter'])
    role: OrgRole;

    @IsString()
    @IsOptional()
    membership_id?: string;

    @IsString()
    @IsOptional()
    branch_id?: string;

    @IsString()
    @IsOptional()
    department?: string;

    @IsNumber()
    @IsOptional()
    shareholder_weight?: number;
}
