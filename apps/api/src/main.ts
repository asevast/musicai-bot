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
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { loadEnv } from '@musicai/config';
import { IoAdapter } from './ws-adapter.js';

const env = loadEnv();

async function bootstrap() {
  // Get body parser limit from env or default to 5mb
  const bodyParserLimit = process.env.BODY_PARSER_LIMIT || '5mb';

  // Create app with rawBody option to handle large payloads
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Apply JSON body parser with increased limit BEFORE NestJS initializes
  // This overrides the default body parser with our custom limits
  app.use(json({ limit: bodyParserLimit }));
  app.use(urlencoded({ limit: bodyParserLimit, extended: true }));

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  });

  // Setup WebSocket adapter for real-time notifications
  app.useWebSocketAdapter(new IoAdapter(app));

  await app.listen(env.PORT);
  console.log(`API server running on port ${env.PORT} (body parser limit: ${bodyParserLimit})`);
}

bootstrap();
