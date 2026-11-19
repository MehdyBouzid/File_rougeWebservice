import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { featureEntities } from '../../persistence/feature-entities.generated';
import { MeasurementsController } from './controllers/measurements.controller';
import { MeasurementsService } from './services/measurements.service';

// Assemble le Controller et le Service, puis rend le Service accessible aux autres modules.
// Le registre TypeORM prépare les repositories ; il ne configure pas la connexion.
@Module({
  imports: [TypeOrmModule.forFeature(featureEntities.measurements)],
  controllers: [MeasurementsController],
  providers: [MeasurementsService],
  exports: [MeasurementsService],
})
export class MeasurementsModule {}
