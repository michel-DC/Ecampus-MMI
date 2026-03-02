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
    return { status: 'ça fonctionne mon reuf' };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: JwtPayload): Promise<UserResponse> {
    this.logger.log(`Fetching profile for user: ${user.sub}`);
    return this.authService.findUserById(user.sub);
  }

  @Post('onboarding')
  @UseGuards(AuthGuard)
  async onboarding(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: OnboardingDto,
  ): Promise<{ message: string }> {
    await this.authService.completeOnboarding(currentUser.sub, dto);
    return { message: 'Onboarding completed successfully' };
  }

  @Post('*path')
  @Get('*path')
  async handleAuth(@Req() req: Request, @Res() res: Response): Promise<void> {
    this.logger.log(`Better Auth handler reached: ${req.method} ${req.url}`);
    return toNodeHandler(auth)(req, res);
  }
}
