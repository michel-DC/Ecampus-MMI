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
@UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
export class SaesController {
  constructor(private readonly saesService: SaesService) {}

  @Get()
  async findAll(
    @Query() filters: SaeFiltersDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    const result = await this.saesService.findAll(filters, user.sub, user.role);
    return { success: true, ...result };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    const result = await this.saesService.findOne(id, user.sub, user.role);
    return { success: true, data: result };
  }

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async create(
    @Body() dto: CreateSaeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    const result = await this.saesService.create(dto, user.sub);
    return { success: true, data: result };
  }

  @Patch(':id')
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
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async publish(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    const result = await this.saesService.publish(id, user.sub);
    return { success: true, data: result };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK) // Changé de NO_CONTENT à OK pour pouvoir renvoyer le body success: true
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    await this.saesService.remove(id, user.sub);
    return { success: true, message: 'SAE supprimée avec succès' };
  }

  @Post(':id/invitations')
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
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async findInvitations(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    const result = await this.saesService.findInvitations(id, user.sub);
    return { success: true, data: result };
  }
}
