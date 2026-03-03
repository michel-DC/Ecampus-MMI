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
  findSaeDocuments(
    @Param('saeId') saeId: string,
    @CurrentUser() user?: JwtPayload,
  ): Promise<SaeDocumentResponse[]> {
    return this.documentsService.findSaeDocuments(saeId, user?.role);
  }

  @Post('documents')
  @UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  addSaeDocument(
    @Param('saeId') saeId: string,
    @Body() dto: CreateSaeDocumentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SaeDocumentResponse> {
    return this.documentsService.addSaeDocument(saeId, dto, user.sub);
  }

  @Delete('documents/:documentId')
  @UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async removeSaeDocument(
    @Param('documentId') documentId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean }> {
    await this.documentsService.removeSaeDocument(documentId, user.sub);
    return { success: true };
  }

  @Post('submission')
  @UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
  @Roles(UserRole.STUDENT)
  submitDocument(
    @Param('saeId') saeId: string,
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<StudentSubmissionResponse> {
    return this.documentsService.submitDocument(saeId, dto, user.sub);
  }

  @Get('submission/me')
  @UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
  @Roles(UserRole.STUDENT)
  findMySubmission(
    @Param('saeId') saeId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<StudentSubmissionResponse> {
    return this.documentsService.findMySubmission(saeId, user.sub);
  }

  @Get('submissions')
  @UseGuards(OptionalAuthGuard)
  findAllSubmissions(
    @Param('saeId') saeId: string,
    @CurrentUser() user?: JwtPayload,
  ): Promise<StudentSubmissionResponse[]> {
    return this.documentsService.findAllSubmissions(saeId, user?.role);
  }
}
