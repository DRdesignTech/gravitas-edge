import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RvaCouponsService } from './rva-coupons.service';
import { RvaValidateCouponDto } from './dto/rva-validate-coupon.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/auth.types';

@ApiTags('recruitment-vendor')
@ApiBearerAuth()
@Controller('recruitment-vendor/coupons')
export class RvaCouponsController {
  constructor(private readonly coupons: RvaCouponsService) {}

  @Post('validate')
  @ApiOperation({
    summary:
      'Validate an RVA coupon for an RVA plan and return the server-calculated price breakdown (original / discount / final)',
  })
  validate(@CurrentUser() user: AuthenticatedUser, @Body() dto: RvaValidateCouponDto) {
    return this.coupons.validateForUser(user.id, dto);
  }

  @Get('available')
  @ApiOperation({
    summary:
      'List RVA coupons the current user can apply to an RVA plan, with the calculated discount',
  })
  listAvailable(@CurrentUser() user: AuthenticatedUser, @Query('planId') planId?: string) {
    if (!planId) {
      throw new BadRequestException('planId is required');
    }
    return this.coupons.listAvailableForUser(user.id, planId);
  }
}
