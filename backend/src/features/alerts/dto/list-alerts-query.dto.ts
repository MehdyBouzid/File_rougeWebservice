import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  IsRfc3339DateTime,
  toStrictQueryInt,
} from '../../../common/validation/validation.utils';
import { AlertStatus } from '../entities/alert.entity';

export class ListAlertsQueryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  patientId?: string;

  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @IsOptional()
  @IsString()
  @IsRfc3339DateTime()
  startDate?: string;

  @IsOptional()
  @IsString()
  @IsRfc3339DateTime()
  endDate?: string;

  @IsOptional()
  @Transform(toStrictQueryInt)
  @IsInt()
  @Min(0)
  page?: number;

  @IsOptional()
  @Transform(toStrictQueryInt)
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number;
}
