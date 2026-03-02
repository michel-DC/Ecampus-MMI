import { Module } from '@nestjs/common';
import { SaesController } from './saes.controller';
import { SaesService } from './saes.service';

@Module({
  controllers: [SaesController],
  providers: [SaesService],
  exports: [SaesService],
})
export class SaesModule {}
