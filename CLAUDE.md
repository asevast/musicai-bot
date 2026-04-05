# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This repository is in **active development**. Core MVP features are implemented.

## Primary Documentation

**SPEC.md** is the authoritative source for this project. It contains:
- Complete technology stack (grammY, NestJS, BullMQ, Prisma, PostgreSQL, Redis, Google Cloud Storage, Vertex AI Lyria 3)
- Database schema (Prisma)
- System architecture (CQRS, event-driven, hexagonal)
- Telegram bot commands and scenes
- BullMQ job queue configuration
- Monetization and credits system
- Development phases (6 stages, MVP through beta)

## Architecture

```
apps/
├── bot/          # grammY Telegram Bot
├── api/          # NestJS REST API
└── worker/       # BullMQ Workers (Cloud Run Jobs)

packages/
├── database/     # Prisma schema + migrations
├── vertex-ai/    # Lyria 3 client wrapper
├── shared-types/ # Common types/DTOs
├── config/       # Zod ENV validation
└── queues/       # BullMQ queue configuration and producers
```

## Key Constraints

- **Vertex AI quota:** 10 req/min per region (hard limit)
- **Lyria 3 limitations:** No multi-turn editing, no inpainting, no audio-to-audio, no voice cloning
- **Workarounds documented:** See section 13 in SPEC.md for editing lyrics and batch generation

## Development Commands

```bash
# Install dependencies
pnpm install

# Start local services (PostgreSQL + Redis)
docker-compose up -d

# Generate Prisma client
pnpm db:generate

# Push database schema
pnpm db:push

# Run services
pnpm --filter @musicai/bot dev
pnpm --filter @musicai/api dev
pnpm --filter @musicai/worker dev

# Build
pnpm build
```

## Environment Variables

Required variables in `.env`:
- `BOT_TOKEN` - Telegram bot token
- `GOOGLE_CLOUD_PROJECT` - GCP project ID
- `GCS_BUCKET_NAME` - GCS bucket for MP3 files
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string

## Queue Configuration

BullMQ queues are configured in `packages/queues/src/queues.config.ts`:
- `synth:pro:urgent` - Paid users, priority 10
- `synth:pro:normal` - Free users, priority 1
- `synth:clip` - Clip generation
- `notify` - Telegram notifications

Rate limits per queue respect Vertex AI quota (10 req/min).

## API Authentication

API endpoints require `X-Telegram-Id` header for authentication. Use `TelegramAuthGuard` to protect endpoints.

## Rate Limiting

Use `GenerateRateLimitMiddleware` for track generation and `CommandRateLimitMiddleware` for commands. Limits are configurable via environment variables.
EOF