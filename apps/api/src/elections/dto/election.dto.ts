import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString, IsBoolean, IsNumber, IsArray } from 'class-validator';

export class CreateElectionDto {
    @IsString()
    @IsNotEmpty()
    org_id: string;

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsEnum(['single_choice', 'multiple_choice', 'ranked_choice', 'weighted', 'referendum', 'score'])
    voting_method: string;

    @IsEnum(['anonymous', 'hybrid', 'transparent'])
    anonymity_level: string;

    @IsEnum(['realtime', 'after_close', 'manual_release', 'admin_only'])
    result_visibility: string;

    @IsDateString()
    @IsOptional()
    start_at?: string;

    @IsDateString()
    @IsOptional()
    end_at?: string;

    @IsNumber()
    @IsOptional()
    quorum_percent?: number;

    @IsBoolean()
    @IsOptional()
    allow_proxy_voting?: boolean;

    @IsString()
    @IsOptional()
    eligibility_department?: string;

    @IsString()
    @IsOptional()
    eligibility_branch_id?: string;

    @IsNumber()
    @IsOptional()
    eligibility_min_level?: number;
}

export class UpdateElectionDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsDateString()
    @IsOptional()
    start_at?: string;

    @IsDateString()
    @IsOptional()
    end_at?: string;

    @IsNumber()
    @IsOptional()
    quorum_percent?: number;
}

export class TransitionElectionDto {
    @IsEnum(['scheduled', 'open', 'closed', 'archived'])
    target_state: string;
}

export class CreatePositionDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @IsOptional()
    max_selections?: number;

    @IsNumber()
    @IsOptional()
    sort_order?: number;
}

export class CreateCandidateDto {
    @IsString()
    @IsNotEmpty()
    position_id: string;

    @IsString()
    @IsOptional()
    user_id?: string;

    @IsString()
    @IsNotEmpty()
    display_name: string;

    @IsString()
    @IsOptional()
    manifesto?: string;

    @IsString()
    @IsOptional()
    photo_url?: string;

    @IsString()
    @IsOptional()
    campaign_video_url?: string;
}
