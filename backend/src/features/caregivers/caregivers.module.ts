import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { featureEntities } from '../../persistence/feature-entities.generated';
import { CaregiversController } from './controllers/caregivers.controller';
import { CaregiversService } from './services/caregivers.service';

@Module({
  imports: [TypeOrmModule.forFeature(featureEntities.caregivers)],
  controllers: [CaregiversController],
  providers: [CaregiversService],
  exports: [CaregiversService],
})
export class CaregiversModule {}
