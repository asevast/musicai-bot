# AGENTS.md - Development Guide

## Build & Run Commands

### Root Level (pnpm monorepo + turbo)

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Start all apps in dev mode (turbo)
pnpm build                # Build all packages and apps
pnpm format               # Format all files with prettier
docker-compose up -d      # Start PostgreSQL + Redis locally
```

### Per-Package Commands

```bash
pnpm --filter @musicai/bot dev        # Run bot app only
pnpm --filter @musicai/api dev        # Run API app only
pnpm --filter @musicai/worker dev     # Run worker app only
pnpm --filter @musicai/database generate  # Generate Prisma client
pnpm --filter @musicai/database push      # Push schema to database
pnpm --filter @musicai/database studio    # Open Prisma Studio
```

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
