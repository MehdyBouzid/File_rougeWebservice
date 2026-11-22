import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CallerAuthGuard } from '../../../common/auth/caller-auth.guard';
import type { AuthenticatedCaller } from '../../../common/auth/caller.types';
import {
  CurrentCaller,
  RequireScopes,
} from '../../../common/auth/scopes.decorator';
import { ProblemDetailsFilter } from '../../../common/http/problem-details.filter';
import { ListMeasurementsQueryDto } from '../dto/list-measurements-query.dto';
import { MeasurementBatchDto } from '../dto/measurement-batch.dto';
import type {
  BatchReceiptDto,
  MeasurementPageDto,
} from '../dto/measurement-response.dto';
import { MeasurementsService } from '../services/measurements.service';

@Controller()
@UseFilters(ProblemDetailsFilter)
@UseGuards(CallerAuthGuard)
export class MeasurementsController {
  constructor(private readonly measurementsService: MeasurementsService) {}

  @Post('measurements')
  @HttpCode(HttpStatus.CREATED)
  @RequireScopes('montre')
  async ingestMeasurements(
    @Body() dto: MeasurementBatchDto,
    @CurrentCaller() caller: AuthenticatedCaller,
    @Res({ passthrough: true }) response: Response,
  ): Promise<BatchReceiptDto> {
    const receipt = await this.measurementsService.ingestBatch(dto, caller);
    response.setHeader(
      'Location',
      `/measurements/${encodeURIComponent(receipt.batchId)}`,
    );
    return receipt;
  }

  @Get('patients/:patientId/measurements')
  @RequireScopes('soignant')
  listPatientMeasurements(
    @Param('patientId') patientId: string,
    @Query() query: ListMeasurementsQueryDto,
    @CurrentCaller() caller: AuthenticatedCaller,
  ): Promise<MeasurementPageDto> {
    return this.measurementsService.listPatientMeasurements(
      patientId,
      query,
      caller,
    );
  }
}
