import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  IsRfc3339DateTime,
  toStrictQueryInt,
} from '../../../common/validation/validation.utils';

export class ListMeasurementsQueryDto {
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
