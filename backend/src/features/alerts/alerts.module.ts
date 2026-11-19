import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { featureEntities } from '../../persistence/feature-entities.generated';
import { AlertsController } from './controllers/alerts.controller';
import { AlertsService } from './services/alerts.service';

// Assemble le Controller et le Service, puis rend le Service accessible aux autres modules.
// Le registre TypeORM prépare les repositories ; il ne configure pas la connexion.
@Module({
  imports: [TypeOrmModule.forFeature(featureEntities.alerts)],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
