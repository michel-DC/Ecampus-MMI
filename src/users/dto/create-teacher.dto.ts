import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateTeacherDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstname: string;

  @IsString()
  @IsNotEmpty()
  lastname: string;
}
