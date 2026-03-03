import { IsEnum, IsString, IsUrl } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class CreateSaeDocumentDto {
  @IsUrl()
  url: string;

  @IsString()
  name: string;

  @IsString()
  mimeType: string;

  @IsEnum(DocumentType)
  type: DocumentType;
}
