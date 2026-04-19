# AGENTS.md - Development Guide

## Quick Start

```bash
pnpm install

# Option A: Docker Compose (recommended)
docker compose up -d --build          # First time
docker compose exec api pnpm --filter @musicai/database migrate dev  # One-time

# Option B: Host-based (requires local Postgres on 5433, Redis on 6379)
pnpm db:generate && pnpm db:push
pnpm dev                            # Starts all apps via Turbo
```

## Dev Environments: Critical Distinction

|  | Host-based | Docker Compose |
|---|---|---|
| **Env file** | `.env` | `.env.development` |
| **Postgres** | `localhost:5433` | `postgres:5432` (service name) |
| **Redis** | `localhost:6379` | `redis:6379` (service name) |
| **Command** | `pnpm --filter @musicai/bot dev` | `docker compose up -d` |

**Never commit either `.env` file**—both are gitignored.

## Services & Ports

| Service | Port | Command (host) |
|---------|------|----------------|
| API | 3000 | `pnpm --filter @musicai/api dev` |
| Bot | — | `pnpm --filter @musicai/bot dev` |
| Worker | — | `pnpm --filter @musicai/worker dev` |
| Adminer | 8080 | Docker only |
| Bull Board | 3002 | Docker only (was 3001, now remapped) |
| MinIO Console | 9001 | `admin/minioadmin` |

## Monorepo Structure

```
apps/
  api/       NestJS REST API (port 3000)
  bot/       grammY Telegram bot (long polling dev, webhook prod)
  worker/    BullMQ job processors
packages/
  config/    Zod env validation
  database/  Prisma client + schema
  queues/    BullMQ config + producers
  storage/   GCS/MinIO uploads
  vertex-ai/ Lyria 3 client
  shared-types/
```

**Package scripts** (all support `dev`, `build`, `test`):
```bash
pnpm --filter @musicai/database generate   # Prisma client
pnpm --filter @musicai/database migrate    # Migrations
pnpm --filter @musicai/database studio     # Prisma Studio
```

## Code Style

```bash
pnpm format   # Prettier: single quotes, semis, 2-space, 100 width
```

- **Files**: kebab-case with suffix (`tracks.service.ts`, `start.command.ts`)
- **Imports**: external → `@musicai/*` → relative
- **Types**: `strict: true` in base config, but bot app overrides to `strict: false`

## Critical Gotchas

### NestJS DI Requires Explicit `@Inject()`
`tsx` uses esbuild which does NOT emit decorator metadata. Always use:
```typescript
constructor(@Inject(SomeService) private readonly svc: SomeService)
```
Relying on type reflection causes `undefined` at runtime.

### Stale `dist/` Builds
Apps import compiled JS from packages' `dist/` folders. After editing `packages/*`, **must rebuild** before restarting services:
```bash
pnpm build   # Or: pnpm --filter @musicai/<package> build
```
The worker may silently run old compiled code.

### Worker Startup Hang
`pnpm --filter @musicai/worker dev` can hang due to stdin. Use instead:
```bash
cd apps/worker && npx tsx src/main.ts
```

### Prisma Query Engine in Docker
Database package has native binaries. Mount only `prisma/` folder, not `node_modules/` or `dist/`, to preserve compiled query engine.

### Vertex AI Quota
**10 req/min per region** (hard limit). Queue rate limits respect this. Use `lyria-3-clip-preview` (30s) for testing, not Pro model.

### BullMQ Prioritized Jobs
Jobs with explicit priority go to `bull:<queue>:prioritized` sorted set, not `wait` list. Check the right key when debugging Redis.

### Lyria API Uses Proxy
Connects to `routerai.ru/api/v1`, not direct Vertex AI. `LYRIA_API_KEY` is the proxy key.

## Testing

```bash
pnpm test:run                    # All tests once
pnpm vitest run <path>           # Single file
pnpm --filter @musicai/api test  # Per-package
```

## Docker Compose Commands

```bash
docker compose up -d              # Start all services
docker compose down -v            # Full reset (removes volumes)
docker compose restart worker     # Restart single service
docker compose logs -f bot        # Follow logs
docker compose build --no-cache   # Rebuild after dependency changes

# Prisma inside container
docker compose exec api pnpm --filter @musicai/database generate
docker compose exec api pnpm --filter @musicai/database studio
```

## Architecture Patterns

- **API**: Controller → Service → Repository → Prisma
- **Bot**: Commands in `commands/*.command.ts`, keyboards in `keyboards/*.keyboard.ts`, scenes in `scenes/`
- **Worker**: Processors in `processors/*.processor.ts`
- **Auth**: `X-Telegram-Id` header + `TelegramAuthGuard`
- **Queues**: `SynthJobProducer` for adding jobs (respects rate limits)

## Environment Variables

Key required: `BOT_TOKEN`, `GOOGLE_CLOUD_PROJECT`, `DATABASE_URL`, `REDIS_URL`

See `.env.example` for full list. Validated at startup via `@musicai/config` Zod schema.
