import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OnboardingGuard } from '../auth/guards/onboarding.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/types/auth.types';
import {
  SaeDocumentResponse,
  StudentSubmissionResponse,
} from '../documents/types/document.types';
import { UploadResourceDto } from './dto/upload-resource.dto';
import { ResourcesService } from './resources.service';
import {
  BannerResponse,
  GroupResponse,
  PromotionResponse,
  SemesterResponse,
  ThematicResponse,
} from './types/resource.types';

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
  ): Promise<{
    success: boolean;
    data: StudentSubmissionResponse | SaeDocumentResponse;
  }> {
    const data = await this.resourcesService.uploadAndRegister(
      file,
      dto,
      user.sub,
      user.role,
    );
    return { success: true, data };
  }

  @Post('upload-image')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ success: boolean; data: { url: string } }> {
    const result = await this.resourcesService.uploadProfileImage(file);
    return { success: true, data: result };
  }

  @Get('banners')
  async getBanners(): Promise<{ success: boolean; data: BannerResponse[] }> {
    const banners = await this.resourcesService.findBanners();
    return { success: true, data: banners };
  }

  @Get('promotions')
  async getPromotions(): Promise<{
    success: boolean;
    data: PromotionResponse[];
  }> {
    const data = await this.resourcesService.findAllPromotions();
    return { success: true, data };
  }

  @Get('groups')
  async getGroups(): Promise<{ success: boolean; data: GroupResponse[] }> {
    const data = await this.resourcesService.findAllGroups();
    return { success: true, data };
  }

  @Get(['semesters', 'semester'])
  async getSemesters(): Promise<{
    success: boolean;
    data: SemesterResponse[];
  }> {
    const data = await this.resourcesService.findAllSemesters();
    return { success: true, data };
  }

  @Get('thematics')
  async getThematics(): Promise<{
    success: boolean;
    data: ThematicResponse[];
  }> {
    const data = await this.resourcesService.findAllThematics();
    return { success: true, data };
  }
}
