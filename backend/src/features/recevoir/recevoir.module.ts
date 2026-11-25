import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecevoirController } from './controllers/recevoir.controller';
import { Recevoir } from './entities/recevoir.entity';
import { RecevoirRepository } from './repositories/recevoir.repository';
import { RecevoirService } from './services/recevoir.service';

@Module({
  imports: [TypeOrmModule.forFeature([Recevoir])],
  controllers: [RecevoirController],
  providers: [RecevoirRepository, RecevoirService],
  exports: [RecevoirRepository, RecevoirService],
})
export class RecevoirModule {}
