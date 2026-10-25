import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserSubscriptionsService } from './user-subscriptions.service';
import { PricingService } from './pricing.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/types/auth.types';
import { PurchasePlanDto } from './dto/purchase-plan.dto';
import { ConfirmPurchaseDto } from './dto/confirm-purchase.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class UserSubscriptionsController {
  constructor(
    private readonly userSubscriptionsService: UserSubscriptionsService,
    private readonly pricingService: PricingService,
  ) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Public catalog of active subscription plans' })
  listPublicPlans() {
    return this.userSubscriptionsService.listPublicPlans();
  }

  @Public()
  @Get('pricing')
  @ApiOperation({ summary: 'Public vault pricing matrix (6 vaults x 3 durations)' })
  getPublicPricing() {
    return this.pricingService.getPublicPricing();
  }

  @Post('purchase')
  @ApiOperation({
    summary:
      'Start a purchase for an active plan (server-authoritative price), creating a payment session',
  })
  purchase(@CurrentUser() user: AuthenticatedUser, @Body() dto: PurchasePlanDto) {
    return this.pricingService.purchase(user.id, dto);
  }

  @Post('purchase/verify')
  @ApiOperation({ summary: 'Verify Razorpay payment and activate subscription' })
  verifyPayment(@CurrentUser() user: AuthenticatedUser, @Body() dto: VerifyPaymentDto) {
    return this.pricingService.verifyPayment(user.id, dto);
  }

  @Post('purchase/confirm')
  @ApiOperation({ summary: 'Confirm a purchase and activate the subscription with vault access' })
  confirmPurchase(@CurrentUser() user: AuthenticatedUser, @Body() dto: ConfirmPurchaseDto) {
    return this.pricingService.confirmPurchase(user.id, dto);
  }

  @Post('purchase/fail')
  @ApiOperation({
    summary: 'Mark an owned CREATED payment session as FAILED (test gateway / abandoned checkout)',
  })
  failPurchase(@CurrentUser() user: AuthenticatedUser, @Body() dto: ConfirmPurchaseDto) {
    return this.pricingService.failPayment(user.id, dto.paymentId);
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Fetch an owned payment session for checkout rendering' })
  paymentSession(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.pricingService.getPaymentSession(user.id, id);
  }

  @Get('me')
  @ApiOperation({ summary: "List the authenticated user's own subscriptions" })
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.userSubscriptionsService.listMine(user.id);
  }

  @Get('me/active')
  @ApiOperation({ summary: "Get the authenticated user's currently active subscriptions" })
  listActive(@CurrentUser() user: AuthenticatedUser) {
    return this.userSubscriptionsService.listActive(user.id);
  }

  @Get('me/:id')
  @ApiOperation({ summary: 'Get a specific subscription belonging to the authenticated user' })
  findMine(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.userSubscriptionsService.findMine(user.id, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel AutoPay subscription (preserves paid access until end date)' })
  async cancelSubscription(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.userSubscriptionsService.cancelSubscription(user.id, id);
  }
}
