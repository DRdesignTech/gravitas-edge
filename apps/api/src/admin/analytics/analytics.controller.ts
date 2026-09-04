import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@ApiTags('admin-analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Platform overview KPIs' })
  overview(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.overview(query);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue analytics with timeline' })
  revenue(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.revenue(query);
  }

  @Get('vaults')
  @ApiOperation({ summary: 'Vault performance analytics' })
  vaults(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.vaults(query);
  }

  @Get('opportunities')
  @ApiOperation({ summary: 'Opportunity statistics' })
  opportunities(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.opportunities(query);
  }

  @Get('users')
  @ApiOperation({ summary: 'User registrations, recent activity and top vaults' })
  users(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.users(query);
  }
}
