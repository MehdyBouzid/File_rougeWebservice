import { Controller } from '@nestjs/common';
import { CaregiversService } from '../services/caregivers.service';

// Déclarer ici les routes HTTP uniquement lorsqu’elles sont définies dans le contrat.
// Aucune route caregivers n’est prévue actuellement ; déléguer les futurs traitements au Service.
@Controller()
export class CaregiversController {
  constructor(private readonly caregiversService: CaregiversService) {}
}
