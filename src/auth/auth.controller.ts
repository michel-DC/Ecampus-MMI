import {
  Body,
  ConflictException,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { auth } from '../lib/auth';
import { AuthService } from './auth.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateTeacherDto } from '../users/dto/create-teacher.dto';
import { CreatedTeacherResponse } from '../users/types/user.types';
import { UsersService } from '../users/users.service';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtPayload, UserResponse } from './types/auth.types';
import { toNodeHandler } from 'better-auth/node';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Get('test')
  test(): { success: boolean; message: string } {
    return {
      success: true,
      message: "L'authentification fonctionne correctement.",
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; data: UserResponse; message?: string }> {
    const userData = await this.authService.findUserById(user.sub);
    return { success: true, data: userData };
  }

  @Post('onboarding')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  async onboarding(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: OnboardingDto,
  ): Promise<{ success: boolean; data: null; message: string }> {
    await this.authService.completeOnboarding(currentUser.sub, dto);
    return {
      success: true,
      data: null,
      message: 'Onboarding terminé avec succès.',
    };
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<{ success: boolean; data: null; message: string }> {
    await auth.api.changePassword({
      body: {
        currentPassword: dto.oldPassword,
        newPassword: dto.newPassword,
        revokeOtherSessions: true,
      },
      headers: req.headers as unknown as Record<string, string>,
    });

    return {
      success: true,
      data: null,
      message: 'Mot de passe modifié avec succès.',
    };
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

  @Post('*path')
  @Get('*path')
  async handleAuth(@Req() req: Request, @Res() res: Response): Promise<void> {
    const originalJson = res.json.bind(res);
    res.json = (body: Record<string, unknown>): Response => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (typeof body === 'object' && body !== null && !('success' in body)) {
          body = {
            success: true,
            data: body,
            message:
              body.message ||
              (body.data === null && 'Opération réussie.') ||
              undefined,
          };
        } else if (
          typeof body === 'object' &&
          body !== null &&
          'success' in body &&
          body.success === true &&
          !('data' in body)
        ) {
          body.data = null;
        }
      } else {
        if (typeof body === 'object' && body !== null && !('success' in body)) {
          body = {
            success: false,
            data: null,
            message: body.message || 'Une erreur est survenue.',
          };
        } else if (
          typeof body === 'object' &&
          body !== null &&
          'success' in body &&
          body.success === false &&
          !('data' in body)
        ) {
          body.data = null;
          body.message = body.message || 'Une erreur est survenue.';
        }
      }
      if (body && 'message' in body && body.message === undefined) {
        delete body.message;
      }
      if (body && !('data' in body) && body.success === false) {
        body.data = null;
      }

      return originalJson(body);
    };

    return toNodeHandler(auth)(req, res);
  }
}
