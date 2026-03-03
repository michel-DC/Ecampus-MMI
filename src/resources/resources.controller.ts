import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OnboardingGuard } from '../auth/guards/onboarding.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/auth.types';
import { UploadResourceDto } from './dto/upload-resource.dto';

@Controller('api/resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post('upload')
  @UseGuards(AuthGuard, RolesGuard, OnboardingGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadResourceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.resourcesService.uploadAndRegister(
      file,
      dto,
      user.sub,
      user.role,
    );
  }

  @Get('banners')
  async getBanners(): Promise<any> {
    const banners = await this.resourcesService.findBanners();
    return { success: true, data: banners };
  }

  @Get('promotions')
  async getPromotions() {
    const data = await this.resourcesService.findAllPromotions();
    return { success: true, data };
  }

  @Get('groups')
  async getGroups() {
    const data = await this.resourcesService.findAllGroups();
    return { success: true, data };
  }

  @Get(['semesters', 'semester'])
  async getSemesters() {
    const data = await this.resourcesService.findAllSemesters();
    return { success: true, data };
  }
}
