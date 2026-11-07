import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GrantRvaAccessDto } from './dto/grant-rva-access.dto';
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRvaSubscriptionsService } from './admin-rva-subscriptions.service';
import { QueryRvaSubscriptionsDto } from './dto/query-rva-subscriptions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('admin-recruitment-vendor-subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/recruitment-vendor/subscriptions')
export class AdminRvaSubscriptionsController {
  constructor(private readonly service: AdminRvaSubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'List Recruitment Vendor Access subscriptions (paginated)' })
  list(@Query() query: QueryRvaSubscriptionsDto) {
    return this.service.list(query);
  }

  @Post('grant')
  grant(@Body() dto: GrantRvaAccessDto, @CurrentUser() actor: { id: string }) {
    return this.service.grant(dto, actor.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Recruitment Vendor Access subscription' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
