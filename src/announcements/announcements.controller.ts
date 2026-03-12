import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import {
  AnnouncementListResponse,
  AnnouncementResponse,
} from './types/announcement.types';

@Controller('api/saes/:saeId/announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  async findAll(
    @Param('saeId') saeId: string,
    @CurrentUser() user?: JwtPayload,
  ): Promise<AnnouncementListResponse & { success: boolean }> {
    const result = await this.announcementsService.findAllBySae(
      saeId,
      user?.role,
    );
    return { success: true, ...result };
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: JwtPayload,
  ): Promise<{ success: boolean; data: AnnouncementResponse }> {
    const result = await this.announcementsService.findOne(id, user?.role);
    return { success: true, data: result };
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async create(
    @Param('saeId') saeId: string,
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; data: AnnouncementResponse }> {
    const result = await this.announcementsService.create(saeId, dto, user.sub);
    return { success: true, data: result };
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; data: AnnouncementResponse }> {
    const result = await this.announcementsService.update(id, dto, user.sub);
    return { success: true, data: result };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; message: string }> {
    await this.announcementsService.remove(id, user.sub);
    return { success: true, message: 'Annonce supprimée avec succès' };
  }
}
