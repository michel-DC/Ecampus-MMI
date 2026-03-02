import { IsString, MinLength } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString({ message: 'Le titre doit être une chaîne de caractères' })
  @MinLength(3, { message: 'Le titre doit faire au moins 3 caractères' })
  title: string;

  @IsString({ message: 'Le contenu doit être une chaîne de caractères' })
  @MinLength(10, { message: 'Le contenu doit faire au moins 10 caractères' })
  content: string;
}
