import { Controller, Get } from '@nestjs/common';
import { ResourcesService } from './resources.service';

@Controller('api/resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

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
