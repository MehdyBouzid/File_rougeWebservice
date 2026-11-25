import { Module } from '@nestjs/common';
import { PatientsModule } from './features/patients/patients.module';
import { MeasurementsModule } from './features/measurements/measurements.module';
import { ThresholdsModule } from './features/thresholds/thresholds.module';
import { AlertsModule } from './features/alerts/alerts.module';
import { ConsentsModule } from './features/consents/consents.module';
import { CaregiversModule } from './features/caregivers/caregivers.module';
import { RecevoirModule } from './features/recevoir/recevoir.module';
import { SuivreModule } from './features/suivre/suivre.module';
import { DatabaseModule } from './persistence/database.module';

@Module({
  imports: [
    DatabaseModule,
    PatientsModule,
    MeasurementsModule,
    ThresholdsModule,
    AlertsModule,
    ConsentsModule,
    CaregiversModule,
    SuivreModule,
    RecevoirModule,
  ],
})
export class AppModule {}
