import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  RECRUITMENT_VENDOR_CATEGORY_LABELS,
  RECRUITMENT_VENDOR_CATEGORY_VALUES,
  RECRUITMENT_VENDOR_VAULT_KEY,
} from '../../recruitment-vendor/recruitment-vendor.constants';

/**
 * Admin metadata for the Recruitment Vendor Access vault. Used by the admin
 * vault switcher (phase 2) to identify the vault and its categories without
 * hardcoding them in the UI.
 */
@ApiTags('admin-recruitment-vendor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/recruitment-vendor')
export class AdminRvaMetaController {
  @Get('meta')
  @ApiOperation({ summary: 'Recruitment Vendor Access vault metadata (key, name, categories)' })
  meta() {
    return {
      key: RECRUITMENT_VENDOR_VAULT_KEY,
      name: 'Recruitment Vendor Access',
      categories: RECRUITMENT_VENDOR_CATEGORY_VALUES.map((value) => ({
        value,
        label: RECRUITMENT_VENDOR_CATEGORY_LABELS[value],
      })),
    };
  }
}
