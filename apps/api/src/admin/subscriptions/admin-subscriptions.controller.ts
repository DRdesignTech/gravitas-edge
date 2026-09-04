import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminSubscriptionsService } from './admin-subscriptions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('admin-subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/subscriptions')
export class AdminSubscriptionsController {
  constructor(private readonly adminSubscriptionsService: AdminSubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all subscriptions (admin view, paginated)' })
  list(@Query() query: { page?: number; limit?: number; userId?: string; status?: string }) {
    return this.adminSubscriptionsService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subscription by ID (admin view)' })
  findOne(@Param('id') id: string) {
    return this.adminSubscriptionsService.findOne(id);
  }
}
