import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  console.log('CORS origins from env:', corsOrigins);

  app.enableCors({
    origin: (origin) => {
      if (!origin) return true;
      const allowed = corsOrigins.indexOf(origin) !== -1;
      return allowed ? true : false;
    },
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

  const config = new DocumentBuilder()
    .setTitle('Job Portal API')
    .setDescription('Job Search Portal REST API')
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

  const port = process.env.PORT || 5000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 API running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
