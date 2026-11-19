import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { featureEntities } from '../../persistence/feature-entities.generated';
import { ConsentsController } from './controllers/consents.controller';
import { ConsentsService } from './services/consents.service';

@Module({
  imports: [TypeOrmModule.forFeature(featureEntities.consents)],
  controllers: [ConsentsController],
  providers: [ConsentsService],
  exports: [ConsentsService],
})
export class ConsentsModule {}
