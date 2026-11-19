import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { featureEntities } from '../../persistence/feature-entities.generated';
import { ThresholdsController } from './controllers/thresholds.controller';
import { ThresholdsService } from './services/thresholds.service';

@Module({
  imports: [TypeOrmModule.forFeature(featureEntities.thresholds)],
  controllers: [ThresholdsController],
  providers: [ThresholdsService],
  exports: [ThresholdsService],
})
export class ThresholdsModule {}
