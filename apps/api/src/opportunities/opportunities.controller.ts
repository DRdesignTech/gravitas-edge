import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OpportunitiesService } from './opportunities.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/types/auth.types';

@ApiTags('opportunities')
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Public()
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List published opportunities (public + authenticated)',
    description:
      'Public users see only non-premium opportunities. Authenticated users also see premium opportunities their subscription grants access to.',
  })
  list(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query()
    query: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      country?: string;
      location?: string;
      industry?: string;
      employmentType?: string;
      experienceLevelId?: string;
      vaultId?: string;
      sortBy?: string;
      sortOrder?: string;
      balanced?: string | boolean;
    },
  ) {
    return this.opportunitiesService.listForUser(user?.id, {
      ...query,
      sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc',
    });
  }

  @Public()
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a published opportunity by ID',
    description: 'Premium opportunities require an active subscription with vault access.',
  })
  findOne(@CurrentUser() user: AuthenticatedUser | undefined, @Param('id') id: string) {
    return this.opportunitiesService.findOneForUser(id, user?.id);
  }
}
