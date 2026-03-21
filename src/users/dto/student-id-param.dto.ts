import { IsString } from 'class-validator';

export class StudentIdParamDto {
  @IsString()
  studentId: string;
}
