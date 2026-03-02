import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { auth } from '../lib/auth';
import { AuthService } from './auth.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { AuthGuard } from './guards/auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtPayload, UserResponse } from './types/auth.types';
import { toNodeHandler } from 'better-auth/node';

@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Get('test')
  test() {
    this.logger.log('Test route reached');
    return { success: true, message: 'ça fonctionne mon reuf' };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: JwtPayload): Promise<any> {
    this.logger.log(`Fetching profile for user: ${user.sub}`);
    const userData = await this.authService.findUserById(user.sub);
    return { success: true, data: userData };
  }

  @Post('onboarding')
  @UseGuards(AuthGuard)
  async onboarding(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: OnboardingDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.authService.completeOnboarding(currentUser.sub, dto);
    return { success: true, message: 'Onboarding terminé avec succès' };
  }

  @Post('*path')
  @Get('*path')
  async handleAuth(@Req() req: Request, @Res() res: Response): Promise<void> {
    this.logger.log(`Better Auth handler reached: ${req.method} ${req.url}`);
    
    // Pour intercepter et modifier la réponse JSON si c'est un succès
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (typeof body === 'object' && body !== null && !('success' in body)) {
          body = { success: true, ...body };
        }
      } else {
        if (typeof body === 'object' && body !== null && !('success' in body)) {
          body = { success: false, ...body };
        }
      }
      return originalJson(body);
    };

    return toNodeHandler(auth)(req, res);
  }
}
