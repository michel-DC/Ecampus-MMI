import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { SaesModule } from './saes/saes.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { ResourcesModule } from './resources/resources.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, SaesModule, AnnouncementsModule, ResourcesModule],
})
export class AppModule {}
