import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async findBanners(): Promise<any[]> {
    return this.prisma.banner.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async findAllPromotions() {
    return this.prisma.promotion.findMany({
      where: { isActive: true },
      orderBy: { label: 'asc' },
    });
  }

  async findAllGroups() {
    return this.prisma.group.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findAllSemesters() {
    return this.prisma.semester.findMany({
      orderBy: [{ promotionId: 'asc' }, { number: 'asc' }],
      include: {
        promotion: {
          select: { label: true },
        },
      },
    });
  }
}
