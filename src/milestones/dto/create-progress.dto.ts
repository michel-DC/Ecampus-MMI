import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateProgressDto {
  @IsBoolean()
  isReached: boolean;

  @IsString()
  @IsOptional()
  message?: string;
}
