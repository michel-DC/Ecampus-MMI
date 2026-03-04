import { IsString } from 'class-validator';

export class CreateInvitationDto {
  @IsString({
    message:
      "L'identifiant de l'utilisateur doit être une chaîne de caractères",
  })
  userId: string;
}
