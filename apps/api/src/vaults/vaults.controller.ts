import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { VaultsService } from './vaults.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('vaults')
@Controller('vaults')
export class VaultsController {
  constructor(private readonly vaultsService: VaultsService) {}

  /**
   * Public + authenticated listing. When authenticated, the response shows
   * which vaults are unlocked by the user's active subscription and returns
   * safe metadata for locked vaults (no premium data is leaked).
   */
  @Public()
  @Get()
  @ApiOperation({
    summary: 'List vaults available to the current user (public/accessible/locked)',
  })
  list(@CurrentUser() user?: { id: string }) {
    return this.vaultsService.listForUser(user?.id);
  }

  /**
   * Public + authenticated single-vault lookup. Returns the same safe metadata
   * shape as the listing (locked access-aware) or 404 when the vault does not
   * exist / has been deleted.
   */
  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Get a single vault with access-aware metadata for the current user',
  })
  findOne(@Param('id') id: string, @CurrentUser() user?: { id: string }) {
    return this.vaultsService.findOneForUser(id, user?.id);
  }
}
