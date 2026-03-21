import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateMilestoneDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  position: number;
}
