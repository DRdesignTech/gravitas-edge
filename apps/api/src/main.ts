import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { getCorsOrigins, corsOriginCallback } from './common/cors.util';

async function bootstrap() {
  const isProduction = process.env.ENVIRONMENT === 'production';

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const corsOrigins = getCorsOrigins();
  const corsOrigin = corsOriginCallback(corsOrigins);

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Gravitas Edge Consulting API')
      .setDescription('Gravitas Edge Consulting REST API')
      .setVersion('1.0')
      .addTag('health')
      .addTag('auth')
      .addTag('users')
      .addTag('admin-users')
      .addTag('admin-vaults')
      .addTag('admin-experience-levels')
      .addTag('admin-subscription-plans')
      .addTag('admin-subscriptions')
      .addTag('subscriptions')
      .addTag('vaults')
      .addTag('admin-opportunities')
      .addTag('opportunities')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 5000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 API running on: http://localhost:${port}`);
  console.log(
    `📚 Swagger docs: ${isProduction ? 'disabled in production' : `http://localhost:${port}/api/docs`}`,
  );
}

bootstrap();
