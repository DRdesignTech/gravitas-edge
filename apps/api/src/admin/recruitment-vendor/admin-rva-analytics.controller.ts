import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRvaAnalyticsService } from './admin-rva-analytics.service';
import { AnalyticsQueryDto } from '../analytics/dto/analytics-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('admin-recruitment-vendor-analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/recruitment-vendor/analytics')
export class AdminRvaAnalyticsController {
  constructor(private readonly service: AdminRvaAnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Recruitment Vendor Access overview KPIs (RVA-only)' })
  overview(@Query() query: AnalyticsQueryDto) {
    return this.service.overview(query);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Recruitment Vendor Access revenue analytics (RVA-only)' })
  revenue(@Query() query: AnalyticsQueryDto) {
    return this.service.revenue(query);
  }

  @Get('opportunities')
  @ApiOperation({ summary: 'Recruitment Vendor Access opportunity statistics (RVA-only)' })
  opportunities(@Query() query: AnalyticsQueryDto) {
    return this.service.opportunities(query);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Recruitment Vendor Access subscription breakdown (RVA-only)' })
  subscriptions(@Query() query: AnalyticsQueryDto) {
    return this.service.subscriptions(query);
  }
}
