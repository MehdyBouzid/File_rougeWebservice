import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallerAuthGuard } from '../../common/auth/caller-auth.guard';
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
  providers: [MeasurementsService, CallerAuthGuard],
  exports: [MeasurementsService],
})
export class MeasurementsModule {}
