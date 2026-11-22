import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { CallerAuthGuard } from '../../../common/auth/caller-auth.guard';
import type { AuthenticatedCaller } from '../../../common/auth/caller.types';
import {
  CurrentCaller,
  RequireScopes,
} from '../../../common/auth/scopes.decorator';
import { ProblemDetailsFilter } from '../../../common/http/problem-details.filter';
import type { AlertDetailDto, AlertPageDto } from '../dto/alert-response.dto';
import { AlertUpdateDto } from '../dto/alert-update.dto';
import { ListAlertsQueryDto } from '../dto/list-alerts-query.dto';
import { AlertsService } from '../services/alerts.service';

@Controller()
@UseFilters(ProblemDetailsFilter)
@UseGuards(CallerAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get('alerts')
  @RequireScopes('soignant')
  listAlerts(
    @Query() query: ListAlertsQueryDto,
    @CurrentCaller() caller: AuthenticatedCaller,
  ): Promise<AlertPageDto> {
    return this.alertsService.listAlerts(query, caller);
  }

  @Get('alerts/:alertId')
  @RequireScopes('soignant')
  getAlert(
    @Param('alertId') alertId: string,
    @CurrentCaller() caller: AuthenticatedCaller,
  ): Promise<AlertDetailDto> {
    return this.alertsService.getAlertDetail(alertId, caller);
  }

  @Patch('alerts/:alertId')
  @RequireScopes('soignant')
  acknowledgeAlert(
    @Param('alertId') alertId: string,
    @Body() dto: AlertUpdateDto,
    @CurrentCaller() caller: AuthenticatedCaller,
  ): Promise<AlertDetailDto> {
    return this.alertsService.acknowledgeAlert(alertId, dto, caller);
  }
}
