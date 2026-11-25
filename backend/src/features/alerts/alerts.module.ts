import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { featureEntities } from '../../persistence/feature-entities.generated';
import { CaregiversModule } from '../caregivers/caregivers.module';
import { RecevoirModule } from '../recevoir/recevoir.module';
import { AlertsController } from './controllers/alerts.controller';
import { AlertsService } from './services/alerts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(featureEntities.alerts),
    CaregiversModule,
    RecevoirModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
