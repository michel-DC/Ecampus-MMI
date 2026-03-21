import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/auth.types';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { UpdateProgressDto } from './dto/create-progress.dto';
import {
  MilestoneResponse,
  SaeMilestoneListResponse,
  MySaeMilestonesProgressListResponse,
  SaeMilestoneStatsResponse,
} from './types/milestone.types';
import { ProfileValidatedGuard } from '../auth/guards/profile-validated.guard';

@Controller('api/saes/:saeId/milestones')
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  async getMilestonesForSae(
    @Param('saeId') saeId: string,
    @CurrentUser() user?: JwtPayload,
  ): Promise<{
    success: boolean;
    data: MilestoneResponse[];
    message?: string;
  }> {
    const data = await this.milestonesService.getMilestonesForSae(saeId, user);
    return {
      success: true,
      data,
      message: 'Liste des paliers récupérée avec succès.',
    };
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async createMilestone(
    @Param('saeId') saeId: string,
    @Body() dto: CreateMilestoneDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; data: MilestoneResponse; message?: string }> {
    const data = await this.milestonesService.createMilestone(saeId, dto, user);
    return { success: true, data, message: 'Palier créé avec succès.' };
  }

  @Patch(':milestoneId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async updateMilestone(
    @Param('milestoneId') milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; data: MilestoneResponse; message?: string }> {
    const data = await this.milestonesService.updateMilestone(
      milestoneId,
      dto,
      user,
    );
    return { success: true, data, message: 'Palier mis à jour avec succès.' };
  }

  @Delete(':milestoneId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async deleteMilestone(
    @Param('milestoneId') milestoneId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; message: string }> {
    await this.milestonesService.deleteMilestone(milestoneId, user);
    return { success: true, message: 'Palier supprimé avec succès.' };
  }

  @Post(':milestoneId/progress')
  @UseGuards(AuthGuard, RolesGuard, ProfileValidatedGuard)
  @Roles(UserRole.STUDENT)
  async updateStudentProgress(
    @Param('milestoneId') milestoneId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProgressDto,
  ): Promise<{ success: boolean; data: any; message: string }> {
    const data = await this.milestonesService.updateStudentProgress(
      milestoneId,
      user.sub,
      dto,
      user,
    );
    return {
      success: true,
      data,
      message: 'Progression mise à jour avec succès.',
    };
  }

  @Get(':milestoneId/progress/:studentId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.STUDENT)
  async getStudentProgressForMilestone(
    @Param('milestoneId') milestoneId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; data: any; message?: string }> {
    const data = await this.milestonesService.getStudentProgressForMilestone(
      milestoneId,
      studentId,
      user,
    );
    return {
      success: true,
      data,
      message: 'Progression du palier récupérée avec succès.',
    };
  }

  @Get('progress')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getStudentProgressForSae(
    @Param('saeId') saeId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{
    success: boolean;
    data: SaeMilestoneListResponse;
    message?: string;
  }> {
    const data = await this.milestonesService.getStudentProgressForSae(
      saeId,
      user,
    );
    return {
      success: true,
      data,
      message: 'Progression des paliers de la SAE récupérée avec succès.',
    };
  }

  @Get('progress/me')
  @UseGuards(AuthGuard, RolesGuard, ProfileValidatedGuard)
  @Roles(UserRole.STUDENT)
  async getMySaeProgress(
    @Param('saeId') saeId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{
    success: boolean;
    data: MySaeMilestonesProgressListResponse;
    message?: string;
  }> {
    const data = await this.milestonesService.getMySaeProgress(saeId, user);
    return {
      success: true,
      data,
      message:
        'Votre progression sur les paliers de la SAE récupérée avec succès.',
    };
  }

  @Get('stats')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getSaeMilestoneStats(
    @Param('saeId') saeId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{
    success: boolean;
    data: SaeMilestoneStatsResponse;
    message?: string;
  }> {
    const data = await this.milestonesService.getSaeMilestoneStats(saeId, user);
    return {
      success: true,
      data,
      message: 'Statistiques des paliers récupérées avec succès.',
    };
  }
}
