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
import { SubscriptionPlansService } from './subscription-plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { QueryPlansDto } from './dto/query-plans.dto';
import { LinkVaultDto } from './dto/link-vault.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth.types';

@ApiTags('admin-subscription-plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/subscription-plans')
export class SubscriptionPlansController {
  constructor(private readonly subscriptionPlansService: SubscriptionPlansService) {}

  @Get()
  @ApiOperation({ summary: 'List subscription plans (paginated, searchable)' })
  list(@Query() query: QueryPlansDto) {
    return this.subscriptionPlansService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a plan with its linked vaults' })
  findOne(@Param('id') id: string) {
    return this.subscriptionPlansService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a subscription plan' })
  create(@Body() dto: CreatePlanDto, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.subscriptionPlansService.create(dto, user.id, this.clientIp(req));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subscription plan' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.subscriptionPlansService.update(id, dto, user.id, this.clientIp(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a plan (soft; keeps subscriptions/entitlements intact)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.subscriptionPlansService.remove(id, user.id, this.clientIp(req));
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore an archived plan back into the active catalog' })
  restore(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.subscriptionPlansService.restore(id, user.id, this.clientIp(req));
  }

  @Delete(':id/permanent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete a plan (refused while subscriptions reference it)' })
  hardDelete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.subscriptionPlansService.hardDelete(id, user.id, this.clientIp(req));
  }

  // ---- Plan-vault linking ----

  @Get(':id/vaults')
  @ApiOperation({ summary: 'List vaults a plan grants access to' })
  listVaults(@Param('id') id: string) {
    return this.subscriptionPlansService.listVaults(id);
  }

  @Post(':id/vaults')
  @ApiOperation({ summary: 'Add a vault to a plan (future subscriptions only)' })
  addVault(
    @Param('id') id: string,
    @Body() dto: LinkVaultDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.subscriptionPlansService.addVault(id, dto.vaultId, user.id, this.clientIp(req));
  }

  @Delete(':id/vaults/:vaultId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a vault from a plan' })
  removeVault(
    @Param('id') id: string,
    @Param('vaultId') vaultId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.subscriptionPlansService.removeVault(id, vaultId, user.id, this.clientIp(req));
  }

  private clientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? undefined;
  }
}
