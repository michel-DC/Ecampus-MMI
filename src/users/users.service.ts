import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserFiltersDto } from './dto/user-filters.dto';
import { UserSearchResponse } from './types/user.types';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: UserFiltersDto): Promise<UserSearchResponse[]> {
    const { q, role, limit = 20 } = filters;

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: role,
        OR: q
          ? [
              { firstname: { contains: q, mode: 'insensitive' } },
              { lastname: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ]
          : undefined,
      },
      select: {
        id: true,
        email: true,
        firstname: true,
        lastname: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      take: limit,
      orderBy: { lastname: 'asc' },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: { firstname: user.firstname, lastname: user.lastname },
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    }));
  }
}
