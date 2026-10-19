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
      'Concise directory of published opportunities with search/pagination/sort. ' +
      'Protected commercial/contact fields are NEVER included in listing responses — ' +
      'even for authenticated RVA subscribers. Fetch a single opportunity for full details.',
  })
  list(@Query() query: Record<string, string | undefined>) {
    return this.opportunitiesService.listForUser({
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
    description:
      'Full commercial/contact details require an active RVA entitlement; ' +
      'unauthorized callers receive server-side masked values.',
  })
  findOne(@CurrentUser() user: AuthenticatedUser | undefined, @Param('id') id: string) {
    return this.opportunitiesService.findOneForUser(id, user?.id);
  }
}
