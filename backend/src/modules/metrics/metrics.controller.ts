import { Controller, Get, Query } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { KpiQueryDto, TrendQueryDto, CategoryQueryDto, RegionQueryDto } from './dto/metrics-query.dto';

@Controller('api/metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('kpi')
  getKpi(@Query() q: KpiQueryDto) {
    return this.metricsService.getKpi(q.date);
  }

  @Get('trend')
  getTrend(@Query() q: TrendQueryDto) {
    return this.metricsService.getTrend(q.range, q.category);
  }

  @Get('category')
  getCategory(@Query() q: CategoryQueryDto) {
    return this.metricsService.getCategory(q.range);
  }

  @Get('region')
  getRegion(@Query() q: RegionQueryDto) {
    return this.metricsService.getRegion(q.range, q.top);
  }
}
