import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: false,
  });

  const corsEnv = (process.env.CORS_ORIGIN ?? '').trim();
  const allowedOrigins = corsEnv
    ? corsEnv.split(',').map((s) => s.trim()).filter(Boolean)
    : (process.env.NODE_ENV === 'production' ? ['*'] : ['http://localhost:3000']);

  if (!corsEnv && process.env.NODE_ENV === 'production') {
    Logger.warn(
      'CORS_ORIGIN is not set — allowing all origins. Set CORS_ORIGIN to lock this down.',
      'Bootstrap',
    );
  }

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`Origin ${origin} not allowed`));
    },
    credentials: true,
  });

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix('api', { exclude: ['health', 'healthz', '/'] });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`API listening on :${port}`, 'Bootstrap');
}

bootstrap();
