import { Controller } from '@nestjs/common';
import { ConsentsService } from '../services/consents.service';

@Controller()
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}
}
