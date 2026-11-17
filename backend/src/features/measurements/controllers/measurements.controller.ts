import { Controller } from '@nestjs/common';
import { MeasurementsService } from '../services/measurements.service';

// Reçoit les requêtes HTTP et retourne les réponses. Déclarer les endpoints ici,
// puis déléguer leur traitement au Service pour garder les règles métier au même endroit.
@Controller()
export class MeasurementsController {
  constructor(private readonly measurementsService: MeasurementsService) {}
}
