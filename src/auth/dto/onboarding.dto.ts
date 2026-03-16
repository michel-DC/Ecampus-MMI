import { IsOptional, IsString, IsUrl } from 'class-validator';

export class OnboardingDto {
  @IsString({
    message: "L'identifiant de la promotion doit être une chaîne de caractères",
  })
  promotionId: string;

  @IsString({
    message: "L'identifiant du groupe doit être une chaîne de caractères",
  })
  groupId: string;

  @IsUrl(
    {},
    {
      message: "L'URL de l'image de profil n'est pas valide",
    },
  )
  @IsOptional()
  imageUrl?: string;
}
