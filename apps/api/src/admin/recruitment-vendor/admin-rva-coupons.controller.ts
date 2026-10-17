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
import { AdminRvaCouponsService } from './admin-rva-coupons.service';
import { CreateRvaCouponDto } from './dto/create-rva-coupon.dto';
import { UpdateRvaCouponDto } from './dto/update-rva-coupon.dto';
import { QueryRvaCouponsDto } from './dto/query-rva-coupons.dto';
import { QueryRvaCouponUsagesDto } from './dto/query-rva-coupon-usages.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth.types';

@ApiTags('admin-recruitment-vendor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/recruitment-vendor/coupons')
export class AdminRvaCouponsController {
  constructor(private readonly adminRvaCouponsService: AdminRvaCouponsService) {}

  @Get()
  @ApiOperation({ summary: 'List RVA coupons (paginated, searchable, status-filtered)' })
  list(@Query() query: QueryRvaCouponsDto) {
    return this.adminRvaCouponsService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an RVA coupon with its applicable RVA plans and eligible users' })
  findOne(@Param('id') id: string) {
    return this.adminRvaCouponsService.findOne(id);
  }

  @Get(':id/usages')
  @ApiOperation({ summary: 'List the RVA redemptions recorded against a coupon' })
  listUsages(@Param('id') id: string, @Query() query: QueryRvaCouponUsagesDto) {
    return this.adminRvaCouponsService.listUsages(id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create an RVA coupon (or reuse the code of an archived one)' })
  create(
    @Body() dto: CreateRvaCouponDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminRvaCouponsService.create(dto, user.id, this.clientIp(req));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an RVA coupon, including enabling/disabling it (isActive) and its plan/user scope',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRvaCouponDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminRvaCouponsService.update(id, dto, user.id, this.clientIp(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive an RVA coupon (soft; redemptions and history stay intact)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.adminRvaCouponsService.remove(id, user.id, this.clientIp(req));
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore an archived RVA coupon' })
  restore(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.adminRvaCouponsService.restore(id, user.id, this.clientIp(req));
  }

  @Delete(':id/permanent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete an RVA coupon (refused while redemptions reference it)' })
  hardDelete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.adminRvaCouponsService.hardDelete(id, user.id, this.clientIp(req));
  }

  private clientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? undefined;
  }
}
