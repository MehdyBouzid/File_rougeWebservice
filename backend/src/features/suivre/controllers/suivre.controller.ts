import { Controller, Get, Query, UseFilters } from '@nestjs/common';
import { ProblemDetailsFilter } from '../../../common/http/problem-details.filter';
import type { FollowedPatientPageDto } from '../dto/followed-patient-response.dto';
import { ListFollowedPatientsQueryDto } from '../dto/list-followed-patients-query.dto';
import { SuivreService } from '../services/suivre.service';

@Controller()
@UseFilters(ProblemDetailsFilter)
export class SuivreController {
  constructor(private readonly suivreService: SuivreService) {}

  @Get('patients')
  listPatients(
    @Query() query: ListFollowedPatientsQueryDto,
  ): Promise<FollowedPatientPageDto> {
    return this.suivreService.listFollowedPatients(query);
  }
}
