import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { toStrictQueryInt } from '../../../common/validation/validation.utils';

export class ListFollowedPatientsQueryDto {
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
