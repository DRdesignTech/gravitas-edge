import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AdminRvaOpportunitiesService } from './admin-rva-opportunities.service';
import { CreateRvaOpportunityDto } from './dto/create-rva-opportunity.dto';
import { UpdateRvaOpportunityDto } from './dto/update-rva-opportunity.dto';
import { QueryRvaOpportunitiesDto } from './dto/query-rva-opportunities.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth.types';

@ApiTags('admin-recruitment-vendor-opportunities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/recruitment-vendor/opportunities')
export class AdminRvaOpportunitiesController {
  constructor(private readonly service: AdminRvaOpportunitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List Recruitment Vendor Access opportunities (paginated)' })
  list(@Query() query: QueryRvaOpportunitiesDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Recruitment Vendor Access opportunity' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a Recruitment Vendor Access opportunity' })
  create(
    @Body() dto: CreateRvaOpportunityDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.service.create(dto, user.id, this.clientIp(req));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a Recruitment Vendor Access opportunity' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRvaOpportunityDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.service.update(id, dto, user.id, this.clientIp(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a Recruitment Vendor Access opportunity' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.service.remove(id, user.id, this.clientIp(req));
  }

  @Delete(':id/permanent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete a Recruitment Vendor Access opportunity' })
  hardDelete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.service.hardDelete(id, user.id, this.clientIp(req));
  }

  private clientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    return req.ip;
  }
}
