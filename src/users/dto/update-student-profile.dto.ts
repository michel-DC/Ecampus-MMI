import { IsString, IsOptional } from 'class-validator';

export class UpdateStudentProfileDto {
  @IsString()
  @IsOptional()
  firstname?: string;

  @IsString()
  @IsOptional()
  lastname?: string;

  @IsString()
  @IsOptional()
  promotionId?: string;

  @IsString()
  @IsOptional()
  groupId?: string;
}
