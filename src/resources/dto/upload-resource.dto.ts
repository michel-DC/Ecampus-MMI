import { IsEnum, IsOptional, IsString, IsUUID, IsUrl } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class UploadResourceDto {
  @IsUUID()
  saeId: string;

  @IsEnum(DocumentType)
  @IsOptional()
  type?: DocumentType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;
}
