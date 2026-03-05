import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { UserRole } from '@prisma/client';
import { Type } from 'class-transformer';

export class UserFiltersDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
