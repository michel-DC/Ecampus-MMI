import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DocumentsService } from './documents.service';
import { UpdateSubmissionVisibilityDto } from './dto/update-submission-visibility.dto';

@Controller('api/promotions')
export class DocumentsAdminController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Patch(':promotionId/submissions/visibility')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateAllPromotionSubmissionsVisibility(
    @Param('promotionId') promotionId: string,
    @Body() dto: UpdateSubmissionVisibilityDto,
  ): Promise<{ success: boolean; data: { updatedCount: number } }> {
    const data =
      await this.documentsService.updateAllPromotionSubmissionsVisibility(
        promotionId,
        dto.isPublic,
      );

    return { success: true, data };
  }
}
