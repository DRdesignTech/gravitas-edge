import {
  Body,
  Controller,
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
import { AdminReferralsService } from './admin-referrals.service';
import {
  AdminQueryCommissionsDto,
  AdminQueryReferralsDto,
  AdminUpdateSlabDto,
  ApproveCommissionDto,
  CancelCommissionDto,
  PayCommissionDto,
  RejectCommissionDto,
  SuspendReferralDto,
} from './dto/admin-referral.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth.types';

@ApiTags('admin-referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/referrals')
export class AdminReferralsController {
  constructor(private readonly adminReferralsService: AdminReferralsService) {}

  @Get()
  @ApiOperation({ summary: 'List referrals (admin view, paginated)' })
  listReferrals(@Query() query: AdminQueryReferralsDto) {
    return this.adminReferralsService.listReferrals(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a referral by ID (admin view)' })
  findReferral(@Param('id') id: string) {
    return this.adminReferralsService.findReferral(id);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a referral' })
  suspendReferral(
    @Param('id') id: string,
    @Body() dto: SuspendReferralDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminReferralsService.suspendReferral(id, dto, actor.id, clientIp(req));
  }
}

@ApiTags('admin-commissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/commissions')
export class AdminCommissionsController {
  constructor(private readonly adminReferralsService: AdminReferralsService) {}

  @Get()
  @ApiOperation({ summary: 'List commissions (admin view, paginated)' })
  listCommissions(@Query() query: AdminQueryCommissionsDto) {
    return this.adminReferralsService.listCommissions(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a commission by ID (admin view)' })
  findCommission(@Param('id') id: string) {
    return this.adminReferralsService.findCommission(id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a PENDING commission' })
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveCommissionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminReferralsService.approveCommission(id, dto, actor.id, clientIp(req));
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a PENDING commission' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectCommissionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminReferralsService.rejectCommission(id, dto, actor.id, clientIp(req));
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a commission as paid' })
  pay(
    @Param('id') id: string,
    @Body() dto: PayCommissionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminReferralsService.payCommission(id, dto, actor.id, clientIp(req));
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a commission' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelCommissionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminReferralsService.cancelCommission(id, dto, actor.id, clientIp(req));
  }
}

@ApiTags('admin-referral-slabs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/referral-slabs')
export class AdminReferralSlabsController {
  constructor(private readonly adminReferralsService: AdminReferralsService) {}

  @Get()
  @ApiOperation({ summary: 'List referral commission slabs' })
  listSlabs() {
    return this.adminReferralsService.listSlabs();
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a referral slab (ranges must not overlap)' })
  updateSlab(
    @Param('id') id: string,
    @Body() dto: AdminUpdateSlabDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminReferralsService.updateSlab(id, dto, actor.id, clientIp(req));
  }
}

// Small helper to avoid duplicating the client-IP extraction in each controller.
function clientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip;
}
