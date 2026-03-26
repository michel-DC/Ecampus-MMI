import { IsBoolean } from 'class-validator';

export class UpdateSubmissionVisibilityDto {
  @IsBoolean()
  isPublic: boolean;
}
