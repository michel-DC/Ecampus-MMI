import { IsNotEmpty, IsUrl } from 'class-validator';

export class UpdateProfileImageDto {
  @IsUrl({}, { message: "L'URL de l'image n'est pas valide" })
  @IsNotEmpty({ message: "L'URL de l'image est obligatoire" })
  imageUrl: string;
}
