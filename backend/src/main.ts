import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cors from 'cors';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  // Sentry (optional)
  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({ dsn: sentryDsn, environment: process.env.NODE_ENV });
    logger.log('Sentry enabled');
  }

  // Security
  app.use(helmet({ contentSecurityPolicy: false }));
  const origins = (process.env.CORS_ORIGINS || '*').split(',').map((s) => s.trim());
  app.use(
    cors({
      origin: origins.includes('*') ? true : origins,
      credentials: true,
    }),
  );

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Global filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Trust proxy (Nginx)
  app.set('trust proxy', 1);

  const port = parseInt(process.env.PORT || '3001', 10);
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 TIC Analysis API running on port ${port}`);
  logger.log(`   CORS origins: ${origins.join(', ')}`);
  logger.log(`   Rate limit: ${process.env.RATE_LIMIT || 60} req/min/IP`);
}

bootstrap();
