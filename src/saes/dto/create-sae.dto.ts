import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateSaeDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsString()
  @MinLength(10)
  @IsOptional()
  instructions?: string;

  @IsUUID()
  semesterId: string;

  @IsString()
  teacherId: string;

  @IsUUID()
  thematicId: string;

  @IsUUID()
  bannerId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsBoolean({ message: 'Le champ isPublished doit être un booléen' })
  isPublished?: boolean;
}
