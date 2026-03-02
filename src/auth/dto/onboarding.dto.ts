import { IsUUID } from 'class-validator';

export class OnboardingDto {
  @IsUUID()
  promotionId: string;

  @IsUUID()
  groupId: string;
}
