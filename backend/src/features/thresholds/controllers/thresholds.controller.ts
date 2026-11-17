import { Controller } from '@nestjs/common';
import { ThresholdsService } from '../services/thresholds.service';

@Controller()
export class ThresholdsController {
  constructor(private readonly thresholdsService: ThresholdsService) {}
}
