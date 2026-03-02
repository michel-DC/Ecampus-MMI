import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import type { SaeStatus } from '../types/sae.types';

export class SaeFiltersDto {
  @IsUUID()
  @IsOptional()
  semesterId?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }: { value: string }) => value === 'true')
  isPublished?: boolean;

  @IsEnum(['draft', 'upcoming', 'ongoing', 'finished'])
  @IsOptional()
  status?: SaeStatus;
}
