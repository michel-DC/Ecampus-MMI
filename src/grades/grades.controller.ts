import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/auth.types';
import { GradesService } from './grades.service';
import { CreateGradeCategoryDto } from './dto/create-category.dto';
import { SetGradeDto } from './dto/set-grade.dto';

@Controller('api')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get('saes/:saeId/grade-categories')
  findCategories(@Param('saeId') saeId: string) {
    return this.gradesService.findCategories(saeId);
  }

  @Get('saes/:saeId/grades')
  findAllSaeGrades(@Param('saeId') saeId: string) {
    return this.gradesService.findAllSaeGrades(saeId);
  }

  @Post('saes/:saeId/grade-categories')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  createCategory(
    @Param('saeId') saeId: string,
    @Body() dto: CreateGradeCategoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.gradesService.createCategory(saeId, dto, user.sub);
  }

  @Get('saes/:saeId/grades/export')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async exportGrades(
    @Param('saeId') saeId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const buffer = await this.gradesService.exportGradesToExcel(saeId, user.sub);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="notes-sae-${saeId}.xlsx"`,
    });
    res.end(buffer);
  }

  @Post('saes/:saeId/grades/import')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async importGrades(
    @Param('saeId') saeId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('Fichier Excel requis');
    await this.gradesService.importGradesFromExcel(saeId, file.buffer, user.sub);
    return { message: 'Notes importées avec succès' };
  }

  @Post('submissions/:submissionId/grades')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  setGrades(
    @Param('submissionId') submissionId: string,
    @Body() body: { grades: SetGradeDto[] },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.gradesService.setSubmissionGrades(submissionId, body.grades, user.sub);
  }

  @Get('submissions/:submissionId/grades')
  findSubmissionGrades(@Param('submissionId') submissionId: string) {
    return this.gradesService.findSubmissionGrades(submissionId);
  }

  @Get('grades/me')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  findMyGrades(@CurrentUser() user: JwtPayload) {
    return this.gradesService.findMyGrades(user.sub);
  }
}
