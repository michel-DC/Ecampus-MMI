import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OnboardingGuard } from '../auth/guards/onboarding.guard';
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
@UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('documents')
  findSaeDocuments(
    @Param('saeId') saeId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<SaeDocumentResponse[]> {
    return this.documentsService.findSaeDocuments(saeId, user.role);
  }

  @Post('documents')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  addSaeDocument(
    @Param('saeId') saeId: string,
    @Body() dto: CreateSaeDocumentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SaeDocumentResponse> {
    return this.documentsService.addSaeDocument(saeId, dto, user.sub);
  }

  @Delete('documents/:documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  removeSaeDocument(
    @Param('documentId') documentId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.documentsService.removeSaeDocument(documentId, user.sub);
  }

  @Post('submission')
  @Roles(UserRole.STUDENT)
  submitDocument(
    @Param('saeId') saeId: string,
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<StudentSubmissionResponse> {
    return this.documentsService.submitDocument(saeId, dto, user.sub);
  }

  @Get('submission/me')
  @Roles(UserRole.STUDENT)
  findMySubmission(
    @Param('saeId') saeId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<StudentSubmissionResponse> {
    return this.documentsService.findMySubmission(saeId, user.sub);
  }

  @Get('submissions')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  findAllSubmissions(
    @Param('saeId') saeId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<StudentSubmissionResponse[]> {
    return this.documentsService.findAllSubmissions(saeId, user.sub);
  }
}
