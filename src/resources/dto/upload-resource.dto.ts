import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class UploadResourceDto {
  @IsUUID()
  saeId: string;

  @IsEnum(DocumentType)
  @IsOptional()
  type?: DocumentType;
}
