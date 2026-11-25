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
} from '@nestjs/common';
import type { Response } from 'express';
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
export class MeasurementsController {
  constructor(private readonly measurementsService: MeasurementsService) {}

  @Post('measurements')
  @HttpCode(HttpStatus.CREATED)
  async ingestMeasurements(
    @Body() dto: MeasurementBatchDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<BatchReceiptDto> {
    const receipt = await this.measurementsService.ingestBatch(dto);
    response.setHeader(
      'Location',
      `/measurements/${encodeURIComponent(receipt.batchId)}`,
    );
    return receipt;
  }

  @Get('patients/:patientId/measurements')
  listPatientMeasurements(
    @Param('patientId') patientId: string,
    @Query() query: ListMeasurementsQueryDto,
  ): Promise<MeasurementPageDto> {
    return this.measurementsService.listPatientMeasurements(patientId, query);
  }
}
