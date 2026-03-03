import { IsString, IsUrl } from 'class-validator';

export class CreateSubmissionDto {
  @IsUrl()
  url: string;

  @IsString()
  name: string;

  @IsString()
  mimeType: string;
}
