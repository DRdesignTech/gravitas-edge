import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth.types';
import { AdminNewsletterService } from './admin-newsletter.service';
import { QueryNewsletterSubscribersDto } from './dto/query-newsletter-subscribers.dto';
import { UpdateNewsletterStatusDto } from './dto/update-newsletter-status.dto';

@ApiTags('admin-newsletter')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/newsletter')
export class AdminNewsletterController {
  constructor(private readonly adminNewsletterService: AdminNewsletterService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get newsletter subscription totals' })
  stats() {
    return this.adminNewsletterService.stats();
  }

  @Get('subscribers')
  @ApiOperation({ summary: 'List newsletter subscribers with search, filter, and pagination' })
  list(@Query() query: QueryNewsletterSubscribersDto) {
    return this.adminNewsletterService.list(query);
  }

  @Patch('subscribers/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle or update a newsletter subscriber status' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateNewsletterStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminNewsletterService.updateStatus(id, dto, user, this.clientIp(req));
  }

  private clientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? undefined;
  }
}
