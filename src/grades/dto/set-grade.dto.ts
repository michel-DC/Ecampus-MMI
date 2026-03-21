import { IsNumber, Max, Min, IsUUID } from 'class-validator';

export class SetGradeDto {
  @IsUUID()
  categoryId: string;

  @IsNumber()
  @Min(0)
  @Max(20)
  value: number;
}
