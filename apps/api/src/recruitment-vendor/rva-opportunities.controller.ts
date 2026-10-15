import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RvaOpportunitiesService } from './rva-opportunities.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/types/auth.types';

@ApiTags('recruitment-vendor-opportunities')
@Controller('recruitment-vendor/opportunities')
export class RvaOpportunitiesController {
  constructor(private readonly opportunitiesService: RvaOpportunitiesService) {}

  @Public()
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List published Recruitment Vendor Access opportunities',
    description:
      'Public visitors receive only permitted preview data (protected commercial/contact fields are masked server-side). ' +
      'Authenticated users with an active RVA subscription receive full details.',
  })
  list(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.opportunitiesService.listForUser(user?.id, {
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      search: query.search,
      category: query.category,
      country: query.country,
      location: query.location,
      sector: query.sector,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc',
    });
  }

  @Public()
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a published Recruitment Vendor Access opportunity by ID',
    description: 'Full commercial/contact details require an active RVA entitlement.',
  })
  findOne(@CurrentUser() user: AuthenticatedUser | undefined, @Param('id') id: string) {
    return this.opportunitiesService.findOneForUser(id, user?.id);
  }
}
