import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OnboardingGuard } from '../auth/guards/onboarding.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/auth.types';
import { DocumentsService } from './documents.service';
import { CreateSaeDocumentDto } from './dto/create-sae-document.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import {
  SaeDocumentResponse,
  StudentSubmissionResponse,
} from './types/document.types';

@Controller('api/saes/:saeId')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('documents')
  @UseGuards(OptionalAuthGuard)
  async findSaeDocuments(
    @Param('saeId') saeId: string,
    @CurrentUser() user?: JwtPayload,
  ): Promise<{ success: boolean; data: SaeDocumentResponse[] }> {
    const data = await this.documentsService.findSaeDocuments(
      saeId,
      user?.role,
    );
    return { success: true, data };
  }

  @Post('documents')
  @UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async addSaeDocument(
    @Param('saeId') saeId: string,
    @Body() dto: CreateSaeDocumentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; data: SaeDocumentResponse }> {
    const data = await this.documentsService.addSaeDocument(
      saeId,
      dto,
      user.sub,
    );
    return { success: true, data };
  }

  @Delete('documents/:documentId')
  @UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async removeSaeDocument(
    @Param('documentId') documentId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; message: string }> {
    await this.documentsService.removeSaeDocument(documentId, user.sub);
    return { success: true, message: 'Document supprimé avec succès' };
  }

  @Post('submission')
  @UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
  @Roles(UserRole.STUDENT)
  async submitDocument(
    @Param('saeId') saeId: string,
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; data: StudentSubmissionResponse }> {
    const data = await this.documentsService.submitDocument(
      saeId,
      dto,
      user.sub,
    );
    return { success: true, data };
  }

  @Get('submission/me')
  @UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
  @Roles(UserRole.STUDENT)
  async findMySubmission(
    @Param('saeId') saeId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; data: StudentSubmissionResponse }> {
    const data = await this.documentsService.findMySubmission(saeId, user.sub);
    return { success: true, data };
  }

  @Get('submissions')
  @UseGuards(OptionalAuthGuard)
  async findAllSubmissions(
    @Param('saeId') saeId: string,
    @CurrentUser() user?: JwtPayload,
  ): Promise<{ success: boolean; data: StudentSubmissionResponse[] }> {
    const data = await this.documentsService.findAllSubmissions(
      saeId,
      user?.sub,
      user?.role,
    );
    return { success: true, data };
  }
}
