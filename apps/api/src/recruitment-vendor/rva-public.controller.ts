import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RvaPlansService } from './rva-plans.service';
import { RvaPricingService } from './rva-pricing.service';
import { RvaSubscriptionsService } from './rva-subscriptions.service';
import { RvaEnrollmentService } from './rva-enrollment.service';
import { RvaFaqsService } from './rva-faqs.service';
import { RvaOverviewService } from './rva-overview.service';
import { RvaPurchasePlanDto } from './dto/rva-purchase-plan.dto';
import { RvaConfirmPurchaseDto } from './dto/rva-confirm-purchase.dto';
import { RvaVerifyPaymentDto } from './dto/rva-verify-payment.dto';
import { RvaEnrollDto } from './dto/rva-enroll.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/types/auth.types';

@ApiTags('recruitment-vendor')
@ApiBearerAuth()
@Controller('recruitment-vendor')
export class RvaPublicController {
  constructor(
    private readonly plans: RvaPlansService,
    private readonly pricing: RvaPricingService,
    private readonly subscriptions: RvaSubscriptionsService,
    private readonly enrollment: RvaEnrollmentService,
    private readonly faqs: RvaFaqsService,
    private readonly overview: RvaOverviewService,
  ) {}

  @Public()
  @Get('overview')
  @ApiOperation({ summary: 'Recruitment Vendor Access landing-page data' })
  getOverview(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('previewLimit') previewLimit?: string,
  ) {
    const limit = previewLimit ? Number(previewLimit) : undefined;
    return this.overview.getOverview(user?.id, limit);
  }

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Public Recruitment Vendor Access plan catalog' })
  listPlans() {
    return this.plans.listPublicPlans();
  }

  @Public()
  @Get('plans/:id')
  @ApiOperation({ summary: 'Public Recruitment Vendor Access plan detail' })
  getPlan(@Param('id') id: string) {
    return this.plans.findPublicPlan(id);
  }

  @Public()
  @Get('faqs')
  @ApiOperation({ summary: 'Public Recruitment Vendor Access FAQs' })
  listFaqs() {
    return this.faqs.listPublicFaqs();
  }

  @Post('enroll')
  @ApiOperation({ summary: 'Create/update the current user RVA onboarding record' })
  enroll(@CurrentUser() user: AuthenticatedUser, @Body() dto: RvaEnrollDto) {
    return this.enrollment.enroll(user.id, dto);
  }

  @Get('enrollment/me')
  @ApiOperation({ summary: "Get the current user's RVA enrollment" })
  getEnrollment(@CurrentUser() user: AuthenticatedUser) {
    return this.enrollment.getMine(user.id);
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Start an RVA plan purchase (server-authoritative price)' })
  purchase(@CurrentUser() user: AuthenticatedUser, @Body() dto: RvaPurchasePlanDto) {
    return this.pricing.purchase(user.id, dto.planId);
  }

  @Post('purchase/verify')
  @ApiOperation({ summary: 'Verify a Razorpay payment and activate the RVA subscription' })
  verify(@CurrentUser() user: AuthenticatedUser, @Body() dto: RvaVerifyPaymentDto) {
    return this.pricing.verifyPayment(user.id, dto);
  }

  @Post('purchase/confirm')
  @ApiOperation({ summary: 'Confirm an RVA purchase and activate the subscription' })
  confirm(@CurrentUser() user: AuthenticatedUser, @Body() dto: RvaConfirmPurchaseDto) {
    return this.pricing.confirmPurchase(user.id, dto.paymentId);
  }

  @Post('purchase/fail')
  @ApiOperation({ summary: 'Mark an owned CREATED RVA payment session as FAILED' })
  fail(@CurrentUser() user: AuthenticatedUser, @Body() dto: RvaConfirmPurchaseDto) {
    return this.pricing.failPayment(user.id, dto.paymentId);
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Fetch an owned RVA payment session for checkout rendering' })
  paymentSession(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.pricing.getPaymentSession(user.id, id);
  }

  @Get('subscriptions/me')
  @ApiOperation({ summary: "List the authenticated user's RVA subscriptions" })
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptions.listMine(user.id);
  }

  @Get('subscriptions/me/active')
  @ApiOperation({ summary: "List the authenticated user's active RVA subscriptions" })
  listActive(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptions.listActive(user.id);
  }

  @Get('subscriptions/me/:id')
  @ApiOperation({ summary: 'Get a specific RVA subscription owned by the user' })
  findMine(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.subscriptions.findMine(user.id, id);
  }

  @Get('access/me')
  @ApiOperation({ summary: "The current user's RVA entitlement summary" })
  getAccess(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptions.getMyAccess(user.id);
  }
}
