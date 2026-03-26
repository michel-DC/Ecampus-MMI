import {
  IsBoolean,
  IsDateString,
  IsIn,
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
  @IsIn(['A', 'B'], {
    message: "Le champ tdGroup doit valoir 'A' ou 'B'",
  })
  tdGroup?: 'A' | 'B';

  @IsOptional()
  @IsBoolean({ message: 'Le champ isPublished doit être un booléen' })
  isPublished?: boolean;
}
