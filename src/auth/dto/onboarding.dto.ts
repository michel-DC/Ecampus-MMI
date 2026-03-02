import { IsString } from 'class-validator';

export class OnboardingDto {
  @IsString({
    message: "L'identifiant de la promotion doit être une chaîne de caractères",
  })
  promotionId: string;

  @IsString({
    message: "L'identifiant du groupe doit être une chaîne de caractères",
  })
  groupId: string;
}
