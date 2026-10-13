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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AdminTestimonialsService } from './admin-testimonials.service';
import { CreateTestimonialDto, UpdateTestimonialDto } from './dto/create-testimonial.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth.types';

@ApiTags('admin-testimonials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/testimonials')
export class AdminTestimonialsController {
  constructor(private readonly adminTestimonialsService: AdminTestimonialsService) {}

  @Get()
  @ApiOperation({ summary: 'List all testimonials (active and inactive), ordered by sortOrder' })
  list() {
    return this.adminTestimonialsService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single testimonial' })
  findOne(@Param('id') id: string) {
    return this.adminTestimonialsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a testimonial' })
  create(
    @Body() dto: CreateTestimonialDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminTestimonialsService.create(dto, user.id, this.clientIp(req));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a testimonial (name, role, quote, LinkedIn link, order, active)',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTestimonialDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminTestimonialsService.update(id, dto, user.id, this.clientIp(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete a testimonial' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.adminTestimonialsService.remove(id, user.id, this.clientIp(req));
  }

  private clientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? undefined;
  }
}
