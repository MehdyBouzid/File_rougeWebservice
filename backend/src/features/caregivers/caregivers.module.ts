import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { featureEntities } from '../../persistence/feature-entities.generated';
import { CaregiversController } from './controllers/caregivers.controller';
import { CaregiversService } from './services/caregivers.service';

// Assemble le Controller et le Service, puis rend le Service accessible aux autres modules.
// Le registre TypeORM prépare les repositories ; il ne configure pas la connexion.
@Module({
  imports: [TypeOrmModule.forFeature(featureEntities.caregivers)],
  controllers: [CaregiversController],
  providers: [CaregiversService],
  exports: [CaregiversService],
})
export class CaregiversModule {}
