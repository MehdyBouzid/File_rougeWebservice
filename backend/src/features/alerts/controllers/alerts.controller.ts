import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseFilters,
} from '@nestjs/common';
import { ProblemDetailsFilter } from '../../../common/http/problem-details.filter';
import type { AlertDetailDto, AlertPageDto } from '../dto/alert-response.dto';
import { AlertUpdateDto } from '../dto/alert-update.dto';
import { ListAlertsQueryDto } from '../dto/list-alerts-query.dto';
import { AlertsService } from '../services/alerts.service';

@Controller()
@UseFilters(ProblemDetailsFilter)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get('alerts')
  listAlerts(@Query() query: ListAlertsQueryDto): Promise<AlertPageDto> {
    return this.alertsService.listAlerts(query);
  }

  @Get('alerts/:alertId')
  getAlert(@Param('alertId') alertId: string): Promise<AlertDetailDto> {
    return this.alertsService.getAlertDetail(alertId);
  }

  @Patch('alerts/:alertId')
  acknowledgeAlert(
    @Param('alertId') alertId: string,
    @Body() dto: AlertUpdateDto,
  ): Promise<AlertDetailDto> {
    return this.alertsService.acknowledgeAlert(alertId, dto);
  }
}
