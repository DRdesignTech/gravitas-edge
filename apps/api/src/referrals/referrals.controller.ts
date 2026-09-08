import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReferralsService } from './referrals.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/auth.types';
import { ListCommissionsQueryDto, ListReferralsQueryDto } from './dto/referral-query.dto';

@ApiTags('referrals')
@ApiBearerAuth()
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post()
  @ApiOperation({ summary: 'Generate (or return existing) referral code and link for the user' })
  async generate(@CurrentUser() user: AuthenticatedUser) {
    return this.referralsService.generateReferralCode(user.id);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my referral summary (code, link, referral counts, earned total)' })
  async summary(@CurrentUser() user: AuthenticatedUser) {
    return this.referralsService.getReferralSummary(user.id);
  }

  @Get('me/referrals')
  @ApiOperation({ summary: 'Paginated list of my referrals' })
  async referrals(@CurrentUser() user: AuthenticatedUser, @Query() query: ListReferralsQueryDto) {
    return this.referralsService.listMyReferrals(user.id, query);
  }

  @Get('me/commissions')
  @ApiOperation({ summary: 'Paginated list of my commissions' })
  async commissions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCommissionsQueryDto,
  ) {
    return this.referralsService.listMyCommissions(user.id, query);
  }

  @Get('me/statistics')
  @ApiOperation({ summary: 'Referral commission statistics for the current user' })
  async statistics(@CurrentUser() user: AuthenticatedUser) {
    return this.referralsService.getCommissionStatistics(user.id);
  }
}
