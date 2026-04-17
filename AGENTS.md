# AGENTS.md - Development Guide

## Build & Run Commands

### Root Level (pnpm monorepo + turbo)

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Start all apps in dev mode (turbo) - runs on HOST
pnpm build                # Build all packages and apps
pnpm format               # Format all files with prettier
```

### Docker Compose Development (All Services in Containers)

Use `.env.development` (Docker service names) instead of `.env` (localhost).

```bash
# First time setup - build images and start all services
docker compose up -d --build

# Apply Prisma migrations (one-time after first start)
docker compose exec api pnpm --filter @musicai/database migrate dev

# Daily development workflow
docker compose up -d          # Start all services (postgres, redis, bot, api, worker, minio, bullboard, adminer)
docker compose down           # Stop all services (data preserved in volumes)
docker compose down -v        # Stop and remove all data (full reset)

# Individual service operations
docker compose restart worker           # Restart single service
docker compose stop bot                 # Stop without removing
docker compose logs -f bot              # Follow bot logs
docker compose logs -f api worker      # Follow multiple services

# After changing package.json or adding dependencies
docker compose build --no-cache         # Rebuild all images
docker compose up -d                    # Start with new images

# Prisma operations inside container
docker compose exec api pnpm --filter @musicai/database generate   # Regenerate client
docker compose exec api pnpm --filter @musicai/database studio    # Open Prisma Studio
```

### Per-Package Commands (Host-based development)

```bash
pnpm --filter @musicai/bot dev        # Run bot app only (on host)
pnpm --filter @musicai/api dev        # Run API app only (on host)
pnpm --filter @musicai/worker dev     # Run worker app only (on host)
pnpm --filter @musicai/database generate  # Generate Prisma client
pnpm --filter @musicai/database push      # Push schema to database
pnpm --filter @musicai/database studio    # Open Prisma Studio
```

### UI Tools (Docker Compose)

| URL                   | Service       | Purpose                                                 |
| --------------------- | ------------- | ------------------------------------------------------- |
| http://localhost:8080 | Adminer       | PostgreSQL database UI                                  |
| http://localhost:3002 | Bull Board    | BullMQ queue monitoring (was 3001)                      |
| http://localhost:9001 | MinIO Console | S3-compatible storage browser (login: admin/minioadmin) |

### Environment Files

- **`.env`** - Host-based development (localhost:5433 for Postgres, localhost:6379 for Redis)
- **`.env.development`** - Docker Compose development (service names: postgres, redis)

Never commit `.env` files - both are gitignored.

### Testing

No test framework is currently configured. When adding tests, use **Jest** or **Vitest**:

```bash
# Single test file (once configured):
pnpm --filter @musicai/api test -- --testPathPattern=tracks.service
# Or with vitest:
pnpm vitest run path/to/file.spec.ts
```

## Code Style

### Formatting (Prettier)

- Single quotes, semicolons required
- 2-space indentation, 100 char print width
- Trailing commas (ES5), arrow parens always
- Run `pnpm format` before committing

### TypeScript

- **Strict mode** enabled (`strict: true`)
- `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns` enforced
- Module resolution: `bundler`
- Use `type` imports for type-only imports: `import type { Foo } from 'bar'`
- Target: ES2022, Module: ESNext

### Naming Conventions

- **Files**: kebab-case with feature suffix (e.g., `tracks.service.ts`, `start.command.ts`, `main-menu.keyboard.ts`)
- **Classes**: PascalCase (`TracksService`, `TelegramAuthGuard`)
- **Functions/variables**: camelCase (`createTrack`, `calcCost`)
- **Constants**: UPPER_SNAKE_CASE (`BOT_TOKEN`, `GCS_BUCKET_NAME`)
- **Interfaces/Types**: PascalCase, prefixed with `I` only for interfaces if needed (`CreateTrackDto`)

### Imports

- Group imports: external libs first, then `@musicai/*` packages, then relative imports
- Use absolute path aliases from `@musicai/*` workspace packages
- Default imports preferred; named imports for specific utilities

### Error Handling

- Use custom error classes for domain errors (e.g., `InsufficientCreditsError`)
- Use `findUniqueOrThrow` for required entities
- Catch and log errors at boundaries (bot.catch, global filters)
- Throw `UnauthorizedException` for auth failures in NestJS
- Propagate unknown errors; handle known errors explicitly

### Architecture Patterns

- **API (NestJS)**: Controller → Service → Prisma pattern
- **Bot (grammY)**: Commands in `commands/*.command.ts`, keyboards in `keyboards/*.keyboard.ts`, scenes in `scenes/`
- **Worker (BullMQ)**: Processors in `processors/*.processor.ts`
- **Packages**: Each package exports from `index.ts` with ESM exports
- Use `@musicai/config` for env validation (Zod schemas)
- API auth via `X-Telegram-Id` header + `TelegramAuthGuard`

### Key Constraints

- Vertex AI quota: 10 req/min per region (hard limit)
- Queue rate limits respect this quota
- Use `SynthJobProducer` for adding jobs to queues
