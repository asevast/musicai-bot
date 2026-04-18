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

const env = loadEnv();

// Configure raw body limit for image uploads (5MB)
process.env.BODY_PARSER_LIMIT = '5mb';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  });

  await app.listen(env.PORT);
  console.log(`API server running on port ${env.PORT}`);
}

bootstrap();
