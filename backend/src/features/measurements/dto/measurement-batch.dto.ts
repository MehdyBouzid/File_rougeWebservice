import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsRfc3339DateTime } from '../../../common/validation/validation.utils';

export class MeasurementItemDto {
  @IsString()
  @IsNotEmpty()
  @IsRfc3339DateTime()
  horodatage!: string;

  @IsInt()
  @Min(0)
  @Max(32767)
  frequenceCardiaque!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  spo2!: number;

  @IsInt()
  @Min(0)
  pas!: number;
}

export class MeasurementBatchDto {
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  batchId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MeasurementItemDto)
  measurements!: MeasurementItemDto[];
}
