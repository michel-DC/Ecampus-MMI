import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { SaesModule } from './saes/saes.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { ResourcesModule } from './resources/resources.module';
import { DocumentsModule } from './documents/documents.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MailModule,
    AuthModule,
    SaesModule,
    AnnouncementsModule,
    ResourcesModule,
    DocumentsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
