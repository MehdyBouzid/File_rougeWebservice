import { Controller } from '@nestjs/common';
import { AlertsService } from '../services/alerts.service';

// Reçoit les requêtes HTTP et retourne les réponses. Déclarer les endpoints ici,
// puis déléguer leur traitement au Service pour garder les règles métier au même endroit.
@Controller()
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}
}
