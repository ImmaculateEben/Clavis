import { IsString, IsNotEmpty, Matches, IsOptional } from 'class-validator';

export class CreateOrgDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/^[a-z0-9-]+$/, {
        message: 'Slug can only contain lowercase letters, numbers, and hyphens',
    })
    slug: string;

    @IsString()
    @IsOptional()
    logo_path?: string;

    @IsString()
    @IsOptional()
    primary_color?: string;
}
