import { IsString, IsUrl, IsOptional, IsBoolean } from 'class-validator';

export class CreateSubmissionDto {
  @IsUrl()
  url: string;

  @IsString()
  name: string;

  @IsString()
  mimeType: string;

  @IsString()
  description: string;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
