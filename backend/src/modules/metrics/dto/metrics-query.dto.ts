import { IsOptional, IsIn, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class KpiQueryDto {
  @IsOptional()
  @IsString()
  date?: string; // YYYY-MM-DD | "today" | "yesterday"
}

export class TrendQueryDto {
  @IsOptional()
  @IsIn(['7d', '30d', '90d'])
  range?: string = '7d';

  @IsOptional()
  @IsIn(['all', 'testing', 'inspection', 'certification'])
  category?: string = 'all';
}

export class CategoryQueryDto {
  @IsOptional()
  @IsIn(['7d', '30d', '90d'])
  range?: string = '30d';
}

export class RegionQueryDto {
  @IsOptional()
  @IsIn(['7d', '30d', '90d'])
  range?: string = '30d';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  top?: number = 10;
}
