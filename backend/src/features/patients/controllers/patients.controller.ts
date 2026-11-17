import { Controller } from '@nestjs/common';
import { PatientsService } from '../services/patients.service';

@Controller()
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}
}
