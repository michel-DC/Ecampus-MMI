import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import { UserFiltersDto } from './dto/user-filters.dto';
import { UserSearchResponse } from './types/user.types';

@Controller('api/users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async findAll(
    @Query() filters: UserFiltersDto,
  ): Promise<UserSearchResponse[]> {
    return this.usersService.findAll(filters);
  }
}
