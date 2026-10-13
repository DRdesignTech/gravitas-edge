import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('testimonials')
@Controller('testimonials')
export class PublicTestimonialsController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active testimonials for the website (public, read-only)' })
  list() {
    return this.prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        role: true,
        badge: true,
        quote: true,
        linkedinUrl: true,
        sortOrder: true,
      },
    });
  }
}
