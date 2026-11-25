import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuivreController } from './controllers/suivre.controller';
import { Suivre } from './entities/suivre.entity';
import { SuivreRepository } from './repositories/suivre.repository';
import { SuivreService } from './services/suivre.service';

@Module({
  imports: [TypeOrmModule.forFeature([Suivre])],
  controllers: [SuivreController],
  providers: [SuivreRepository, SuivreService],
  exports: [SuivreRepository, SuivreService],
})
export class SuivreModule {}
