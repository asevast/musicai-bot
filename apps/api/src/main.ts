import 'reflect-metadata';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadEnv } from '@musicai/config';

const env = loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  });

  await app.listen(env.PORT);
  console.log(`API server running on port ${env.PORT}`);
}

bootstrap();
