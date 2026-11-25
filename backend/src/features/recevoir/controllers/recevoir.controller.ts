import { Controller } from '@nestjs/common';
import { RecevoirService } from '../services/recevoir.service';

// Aucune URI dédiée à RECEVOIR dans le contrat OpenAPI (les routes /alerts sont dans AlertsController).
@Controller()
export class RecevoirController {
  constructor(private readonly recevoirService: RecevoirService) {}
}
