import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserFiltersDto } from './dto/user-filters.dto';
import { UserSearchResponse } from './types/user.types';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: UserFiltersDto): Promise<UserSearchResponse[]> {
    const { q, role, limit = 20 } = filters;

    return this.prisma.user.findMany({
      where: {
        isActive: true,
        role: role,
        OR: q
          ? [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ]
          : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }
}
