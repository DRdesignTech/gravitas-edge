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
import { AdminCouponsService } from './admin-coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { QueryCouponsDto } from './dto/query-coupons.dto';
import { QueryCouponUsagesDto } from './dto/query-coupon-usages.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth.types';

@ApiTags('admin-coupons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/coupons')
export class AdminCouponsController {
  constructor(private readonly adminCouponsService: AdminCouponsService) {}

  @Get()
  @ApiOperation({ summary: 'List coupons (paginated, searchable, status-filtered)' })
  list(@Query() query: QueryCouponsDto) {
    return this.adminCouponsService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a coupon with its applicable plans and eligible users' })
  findOne(@Param('id') id: string) {
    return this.adminCouponsService.findOne(id);
  }

  @Get(':id/usages')
  @ApiOperation({ summary: 'List the redemptions recorded against a coupon' })
  listUsages(@Param('id') id: string, @Query() query: QueryCouponUsagesDto) {
    return this.adminCouponsService.listUsages(id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a coupon (or reuse the code of an archived one)' })
  create(
    @Body() dto: CreateCouponDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminCouponsService.create(dto, user.id, this.clientIp(req));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a coupon, including enabling/disabling it (isActive) and its plan/user scope',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminCouponsService.update(id, dto, user.id, this.clientIp(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a coupon (soft; redemptions and history stay intact)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.adminCouponsService.remove(id, user.id, this.clientIp(req));
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore an archived coupon' })
  restore(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.adminCouponsService.restore(id, user.id, this.clientIp(req));
  }

  @Delete(':id/permanent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete a coupon (refused while redemptions reference it)' })
  hardDelete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.adminCouponsService.hardDelete(id, user.id, this.clientIp(req));
  }

  private clientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? undefined;
  }
}
