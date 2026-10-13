import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/auth.types';

@ApiTags('coupons')
@ApiBearerAuth()
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  @ApiOperation({
    summary:
      'Validate a coupon code for a plan and return the server-calculated price breakdown (original / discount / final)',
  })
  validate(@CurrentUser() user: AuthenticatedUser, @Body() dto: ValidateCouponDto) {
    return this.couponsService.validateForUser(user.id, dto);
  }

  @Get('available')
  @ApiOperation({
    summary: 'List coupons the current user can apply to a plan, with the calculated discount',
  })
  listAvailable(@CurrentUser() user: AuthenticatedUser, @Query('planId') planId?: string) {
    if (!planId) {
      throw new BadRequestException('planId is required');
    }
    return this.couponsService.listAvailableForUser(user.id, planId);
  }
}
