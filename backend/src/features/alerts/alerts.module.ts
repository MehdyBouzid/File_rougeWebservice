import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallerAuthGuard } from '../../common/auth/caller-auth.guard';
import { featureEntities } from '../../persistence/feature-entities.generated';
import { CaregiversModule } from '../caregivers/caregivers.module';
import { AlertsController } from './controllers/alerts.controller';
import { AlertsService } from './services/alerts.service';

@Module({
  imports: [TypeOrmModule.forFeature(featureEntities.alerts), CaregiversModule],
  controllers: [AlertsController],
  providers: [AlertsService, CallerAuthGuard],
  exports: [AlertsService],
})
export class AlertsModule {}
