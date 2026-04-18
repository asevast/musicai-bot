import 'reflect-metadata';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env only if env vars not already set (host dev)
// In Docker, env vars are set via env_file in docker-compose.yml
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadEnv } from '@musicai/config';
import { json, urlencoded } from 'express';

const env = loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Increase body size limits for image uploads (max 5MB)
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ limit: '5mb', extended: true }));

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  });

  await app.listen(env.PORT);
  console.log(`API server running on port ${env.PORT}`);
}

bootstrap();
