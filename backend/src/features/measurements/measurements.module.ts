import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { featureEntities } from '../../persistence/feature-entities.generated';
import { AlertsModule } from '../alerts/alerts.module';
import { CaregiversModule } from '../caregivers/caregivers.module';
import { MeasurementsController } from './controllers/measurements.controller';
import { MeasurementsService } from './services/measurements.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(featureEntities.measurements),
    CaregiversModule,
    AlertsModule,
  ],
  controllers: [MeasurementsController],
  providers: [MeasurementsService],
  exports: [MeasurementsService],
})
export class MeasurementsModule {}
