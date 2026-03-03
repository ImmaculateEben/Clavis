import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber } from 'class-validator';

export class CastVoteDto {
    @IsString()
    @IsNotEmpty()
    election_id: string;

    @IsArray()
    selections: VoteSelection[];

    @IsString()
    @IsOptional()
    device_hash?: string;

    @IsString()
    @IsOptional()
    proxy_for_user_id?: string;
}

export class VoteSelection {
    @IsString()
    @IsNotEmpty()
    position_id: string;

    @IsString()
    @IsNotEmpty()
    candidate_id: string;

    @IsNumber()
    @IsOptional()
    rank?: number; // For ranked choice

    @IsNumber()
    @IsOptional()
    score?: number; // For score voting

    @IsNumber()
    @IsOptional()
    weight?: number; // For weighted voting
}

export class VerifyReceiptDto {
    @IsString()
    @IsNotEmpty()
    receipt_code: string;
}

export class AssignProxyDto {
    @IsString()
    @IsNotEmpty()
    election_id: string;

    @IsString()
    @IsNotEmpty()
    proxy_user_id: string;
}
