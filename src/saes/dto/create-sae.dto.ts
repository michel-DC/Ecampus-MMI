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

  @IsUUID()
  semesterId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  dueDate: string;

  @IsString()
  @IsOptional()
  imageBanner?: string;

  @IsOptional()
  @IsBoolean({ message: 'Le champ isPublished doit être un booléen' })
  isPublished?: boolean;
}
