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
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OnboardingGuard } from '../auth/guards/onboarding.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/auth.types';
import { SaesService } from './saes.service';
import { CreateSaeDto } from './dto/create-sae.dto';
import { UpdateSaeDto } from './dto/update-sae.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { SaeFiltersDto } from './dto/sae-filters.dto';

@Controller('api/saes')
export class SaesController {
  constructor(private readonly saesService: SaesService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  async findAll(
    @Query() filters: SaeFiltersDto,
    @CurrentUser() user?: JwtPayload,
  ): Promise<any> {
    const result = await this.saesService.findAll(
      filters,
      user?.sub,
      user?.role,
    );
    return { success: true, ...result };
  }

  @Get('archives')
  async findArchives(@Query('year') year?: string): Promise<any> {
    const result = await this.saesService.findArchives(
      year ? parseInt(year, 10) : undefined,
    );
    return { success: true, data: result };
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user?: JwtPayload,
  ): Promise<any> {
    const result = await this.saesService.findOne(id, user?.sub, user?.role);
    return { success: true, data: result };
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async create(
    @Body() dto: CreateSaeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    const result = await this.saesService.create(dto, user.sub);
    return { success: true, data: result };
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSaeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    const result = await this.saesService.update(id, dto, user.sub);
    return { success: true, data: result };
  }

  @Post(':id/publish')
  @UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async publish(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    const result = await this.saesService.publish(id, user.sub);
    return { success: true, data: result };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    await this.saesService.remove(id, user.sub);
    return { success: true, message: 'SAE supprimée avec succès' };
  }

  @Post(':id/invitations')
  @UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async createInvitation(
    @Param('id') id: string,
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    const result = await this.saesService.createInvitation(id, dto, user.sub);
    return { success: true, data: result };
  }

  @Get(':id/invitations')
  @UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async findInvitations(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    const result = await this.saesService.findInvitations(id, user.sub);
    return { success: true, data: result };
  }

  @Delete(':id/invitations/:invitationId')
  @UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async removeInvitation(
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    await this.saesService.removeInvitation(id, invitationId, user.sub);
    return { success: true, message: 'Invitation supprimée avec succès' };
  }
}
