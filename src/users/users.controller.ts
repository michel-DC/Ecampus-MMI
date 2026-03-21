import {
  Controller,
  Get,
  Query,
  UseGuards,
  Post,
  Param,
  Body,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import { UserFiltersDto } from './dto/user-filters.dto';
import { UserSearchResponse, CreatedTeacherResponse } from './types/user.types';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { StudentIdParamDto } from './dto/student-id-param.dto';

interface PendingStudentInfo {
  id: string;
  email: string;
  name: { firstname: string; lastname: string | null };
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  promotion?: string;
  academicYear?: number;
  groupName?: string;
  isProfileValidated?: boolean;
}

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async findAll(
    @Query() filters: UserFiltersDto,
  ): Promise<{ success: boolean; data: UserSearchResponse[] }> {
    const data = await this.usersService.findAll(filters);
    return { success: true, data };
  }

  @Post('sign-up/teacher')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async signUpTeacher(@Body() dto: CreateTeacherDto): Promise<{
    success: boolean;
    data: CreatedTeacherResponse;
    message?: string;
  }> {
    try {
      const data = await this.usersService.createTeacher(dto);
      return {
        success: true,
        data,
        message: 'Enseignant créé avec succès.',
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException(error.message);
      } else if (error instanceof InternalServerErrorException) {
        throw new InternalServerErrorException(error.message);
      }
      throw error;
    }
  }

  @Get('pending-validation')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getPendingStudents(): Promise<{
    success: boolean;
    data: PendingStudentInfo[];
    message?: string;
  }> {
    try {
      const data =
        (await this.usersService.getPendingStudents()) as PendingStudentInfo[];
      return {
        success: true,
        data,
        message: 'Liste des étudiants en attente de validation récupérée.',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw new InternalServerErrorException(
        'Erreur lors de la récupération des étudiants en attente.',
      );
    }
  }

  @Post(':studentId/validate')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async validateStudentProfile(
    @Param() params: StudentIdParamDto,
  ): Promise<{ success: boolean; data: null; message: string }> {
    try {
      await this.usersService.validateStudentProfile(params.studentId);
      return {
        success: true,
        data: null,
        message: 'Profil étudiant validé avec succès.',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      } else if (error instanceof ConflictException) {
        throw new ConflictException(error.message);
      }
      throw new InternalServerErrorException(
        'Erreur lors de la validation du profil étudiant.',
      );
    }
  }

  @Post(':studentId/unvalidate')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async unvalidateStudentProfile(
    @Param() params: StudentIdParamDto,
  ): Promise<{ success: boolean; data: null; message: string }> {
    try {
      await this.usersService.unvalidateStudentProfile(params.studentId);
      return {
        success: true,
        data: null,
        message: 'Profil étudiant dévalidé avec succès.',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      } else if (error instanceof ConflictException) {
        throw new ConflictException(error.message);
      }
      throw new InternalServerErrorException(
        'Erreur lors de la dévalidation du profil étudiant.',
      );
    }
  }
}
