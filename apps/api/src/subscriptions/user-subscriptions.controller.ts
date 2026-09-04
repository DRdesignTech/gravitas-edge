import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserSubscriptionsService } from './user-subscriptions.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/types/auth.types';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class UserSubscriptionsController {
  constructor(private readonly userSubscriptionsService: UserSubscriptionsService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Public catalog of active subscription plans' })
  listPublicPlans() {
    return this.userSubscriptionsService.listPublicPlans();
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
}
