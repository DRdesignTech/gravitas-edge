import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health/health.controller';
import { PublicExperienceLevelsController } from './experience-levels/public-experience-levels.controller';
import { PublicTestimonialsController } from './testimonials/public-testimonials.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { VaultsModule } from './vaults/vaults.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { ReferralsModule } from './referrals/referrals.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ResumesModule } from './resumes/resumes.module';
import { PaymentsModule } from './payments/payments.module';
import { RecruitmentVendorModule } from './recruitment-vendor/recruitment-vendor.module';
import { AiModule } from './ai/ai.module';
import { NewsletterModule } from './newsletter/newsletter.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    AdminModule,
    AuditModule,
    VaultsModule,
    SubscriptionsModule,
    OpportunitiesModule,
    ReferralsModule,
    ResumesModule,
    PaymentsModule,
    RecruitmentVendorModule,
    AiModule,
    NewsletterModule,
  ],
  controllers: [HealthController, PublicExperienceLevelsController, PublicTestimonialsController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
