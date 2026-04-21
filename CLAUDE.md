# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MusicAI — a Telegram bot for generating music using Google Lyria 3 (Vertex AI). Text/image prompts become MP3 tracks up to 3 minutes with vocals. Analog of Suno AI. Monorepo managed with **pnpm** + **Turborepo**, Node.js >= 20.

Authoritative spec: `SPEC12.md` (in Russian) — covers full requirements, API constraints, development phases, and workarounds.

## Development Commands

```bash
pnpm install                     # Install all dependencies
docker-compose up -d             # Start PostgreSQL + Redis + MinIO + Adminer

pnpm db:generate                 # Generate Prisma client
pnpm db:push                     # Push schema to database
pnpm db:migrate                  # Run migrations
pnpm db:studio                   # Open Prisma Studio

pnpm --filter @musicai/bot dev       # Run bot only (long polling in dev)
pnpm --filter @musicai/api dev       # Run API only (localhost:3000)
pnpm --filter @musicai/worker dev    # Run worker only

pnpm build                       # Build all packages and apps
pnpm test                        # Run tests (Vitest)
pnpm test:run                    # Run tests once (no watch)
pnpm format                      # Format with Prettier

# Run a single test file:
pnpm vitest run apps/api/src/modules/credits/credits.service.test.ts
```

## Architecture

Three apps communicate through Redis (BullMQ) and HTTP:

```
Telegram → Bot (grammY, webhook port 3001)
               │ HTTP POST (X-Telegram-Id header)
               ▼
           API (NestJS, port 3000) — creates Track + SynthJob in DB
               │ BullMQ job (priority based on user tier)
               ▼
           Worker — calls Lyria 3 → uploads to storage → updates DB
               │ BullMQ notify job
               ▼
           Worker (NotifyProcessor) — sends audio back to Telegram
```

**Design principles:**

- **CQRS** — Commands (generation, purchase) go through BullMQ; Queries (history, profile) read directly via Prisma
- **Event-driven** — track completion published via Redis Pub/Sub → Bot sends audio
- **Repository pattern** — all DB access through `*.repository.ts`, never directly from services
- **Circuit breaker** — wraps Vertex AI client; 3 consecutive 500s → open state for 30s

**Apps** (`apps/`):

- `bot/` — grammY Telegram bot. Commands in `commands/*.command.ts`, keyboards in `keyboards/*.keyboard.ts`, scenes in `scenes/`, middleware in `middleware/`. Uses `ConversationScene` for multi-step flows.
- `api/` — NestJS REST API. Modules: `tracks`, `users`, `credits`, `payments`. Auth via `TelegramAuthGuard` reading `X-Telegram-Id` header. Controllers use guards, services contain business logic.
- `worker/` — BullMQ processors in `processors/*.processor.ts`. `SynthJobProcessor` handles generation; `NotifyProcessor` handles Telegram notifications.

**Packages** (`packages/`):

- `config` — Zod-based env validation via `loadEnv()`
- `database` — Prisma schema + singleton client (global caching for dev hot-reload)
- `queues` — BullMQ queue config, `SynthJobProducer`, `NotifyJobProducer`
- `shared-types` — DTOs shared across apps (`SynthJobPayload`, `CreateTrackDto`, etc.)
- `storage` — S3/MinIO upload, delete, presigned URLs
- `vertex-ai` — Lyria 3 client wrapper with `LyriaErrorCode` mapping and per-code retry config

**Dependency graph**: `config`, `shared-types`, `database`, `vertex-ai` are leaf packages. `storage` → `config`. `queues` → `shared-types`. Apps depend on relevant packages.

## Lyria 3 API

Two models with a hard quota of **10 req/min per region**:

| Model                  | Max duration | Use case                            |
| ---------------------- | ------------ | ----------------------------------- |
| `lyria-3-pro-preview`  | 184s         | Full songs, duration controls       |
| `lyria-3-clip-preview` | 30s          | Fast previews, no duration controls |

Capabilities: text-to-music, image-to-music, vocal generation, instrumental mode, lyrics (AI or user-provided), negative prompting, BPM/intensity controls, prompt rewriter. Output: audio/mp3, 44100 Hz, 192 kbps.

**Lyria 3 limitations** (see SPEC12 §13 for workarounds):

- No multi-turn editing — any change requires full regeneration
- No inpainting — can't edit a section
- No audio-to-audio — text/image input only
- No voice cloning
- 1 clip per request — no batch generation
- SynthID watermark is permanent and survives compression

## Database

Prisma schema at `packages/database/prisma/schema.prisma`. Key models:

- `User` — Telegram users, `subscriptionTier` (free/pro/unlimited), credits balance, referral support
- `Track` — Generated tracks with `status` (queued/processing/done/failed), `type` (full_song/clip/instrumental), stored parameters as JSON
- `SynthJob` — Links to Track, stores BullMQ job ID, attempt count, error codes, timing
- `CreditTransaction` — Append-only audit log (`earn`/`spend`/`buy`/`bonus`/`refund`)

Prisma transactions are used for atomic credit deduction + track creation.

## Queue System

BullMQ queues in `packages/queues/src/queues.config.ts`. Queue selection by model and user tier:

| Queue              | Concurrency | Rate limit | Purpose                  |
| ------------------ | ----------- | ---------- | ------------------------ |
| `synth-pro-urgent` | 2           | max 8/60s  | Paid users (priority 10) |
| `synth-pro-normal` | 3           | max 8/60s  | Free users (priority 1)  |
| `synth-clip`       | 5           | max 9/60s  | Clip generation          |
| `notify`           | 10          | —          | Telegram notifications   |
| `synth-dlq`        | —           | —          | Dead letter queue        |

Sum of rate limits must not exceed Vertex AI quota (10 req/min). Jobs retry 5 times with exponential backoff (5s base). Non-retryable errors (invalid argument, permission denied, recitation filter, vocal likeness) → immediate fail + credit refund. Failed jobs after max attempts → DLQ + refund.

## Credits & Monetization

**Cost per operation:**

- Clip 30s: 1 credit
- Pro <=60s: 3 credits
- Pro 61-184s: 5 credits
- Regeneration: 50% of base price
- AI lyrics generation: 1 credit

**Tiers:** Free (10 credits on signup, clips only, 3/day), Pro (150 credits/mo, 20/day), Unlimited (50/day). Credit packs available (S/M/L, non-expiring 1 year).

**Payment:** Telegram Stars (XTR, native, no gateway fee), YuKassa (Russian cards), Stripe (international). Referral: inviter gets 20% of invitee's first purchase; invitee gets +5 bonus credits.

## Code Style

- Prettier: single quotes, semicolons, 2-space indent, 100 char width, trailing commas (ES5), arrow parens always
- TypeScript strict mode (`strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`); module resolution `bundler`, target ES2022
- Use `import type` for type-only imports
- Files: kebab-case with feature suffix (`tracks.service.ts`, `start.command.ts`, `main-menu.keyboard.ts`)
- Classes: PascalCase. Functions/variables: camelCase. Constants: UPPER_SNAKE_CASE
- Import order: external libs → `@musicai/*` → relative
- Custom error classes for domain errors (e.g., `InsufficientCreditsError`, `LyriaGenerationError` with `LyriaErrorCode` enum)
- Use `findUniqueOrThrow` for required entity lookups
- Input validation limits: prompt 10-1000 chars, negativePrompt 0-300 chars, lyrics 0-2000 chars, BPM 60-200, duration 30-184s, image <=4MB JPEG/PNG
- Run `pnpm format` before committing

## CI/CD

GitHub Actions: `ci.yml` runs on PRs (install + Prisma generate). `deploy.yml` on push to main → Cloud Run deploys for all three apps. Dockerfiles at `infra/docker/` (multi-stage Node 20 Alpine). PM2 (`ecosystem.config.json`) available for self-hosted production.

## Environment Variables

See `.env.example` for the full list. Key required vars: `BOT_TOKEN`, `GOOGLE_CLOUD_PROJECT`, `DATABASE_URL`, `REDIS_URL`. Key optional: `WEBHOOK_URL`/`WEBHOOK_SECRET` (for webhook mode), `GCS_BUCKET_NAME`, `YUKASSA_*`, `STRIPE_*`. Validated at startup via `@musicai/config`'s Zod schema with sensible defaults (e.g., `PORT=3000`, `FREE_DAILY_TRACKS_LIMIT=3`, `VERTEX_AI_LOCATION=us-central1`).

## Gotchas & Known Issues

- **NestJS DI with tsx — `@Inject()` required**: `tsx` uses esbuild which does NOT emit TypeScript decorator metadata (`emitDecoratorMetadata`). NestJS constructor injection requires explicit `@Inject(Token)` decorators on all injected parameters. Without this, injected services are `undefined` at runtime. Always use `constructor(@Inject(SomeService) private readonly svc: SomeService)` instead of relying on type reflection. Run the API with `tsx --tsconfig apps/api/tsconfig.json` so esbuild reads `experimentalDecorators: true` from the tsconfig.
- **Stale `dist/` builds**: The worker and API import compiled JS from packages' `dist/` folders. If you edit `packages/vertex-ai/src/` or other packages, you **must rebuild** (`pnpm build` or `pnpm --filter @musicai/vertex-ai build`) before restarting services. The worker may silently run old compiled code. This caused a production incident where `dist/lyria.client.js` still used `@google-cloud/vertexai` while source had been rewritten to use `routerai.ru` fetch.
- **Worker startup hangs with `pnpm`**: Running the worker via `pnpm exec tsx` or `pnpm --filter @musicai/worker dev` can hang due to stdin handling. Use `npx tsx src/main.ts` or `node --require tsx/cjs dist/main.js` from the worker directory instead. The `ecosystem.config.json` uses `npx tsx` for this reason.
- **API proxy (routerai.ru)**: The Lyria client uses `routerai.ru/api/v1/chat/completions` as a proxy, not direct Vertex AI. The `LYRIA_API_KEY` env var is the proxy API key, not a Google credential. Check the proxy dashboard if audio generation stops returning data — the proxy provider may change behavior without notice.
- **Redis password quoting**: The Redis password in `.env` may be wrapped in quotes. The queues config strips surrounding quotes via regex (`/^["']|["']$/g`). If the worker connects but jobs aren't processed, verify the Redis auth matches between the API (producer) and worker (consumer).
- **Jobs stuck in `prioritized` queue**: BullMQ uses a `prioritized` sorted set (not `wait` list) for jobs with explicit priority. When debugging, check `bull:<queue>:prioritized` in Redis, not just `bull:<queue>:wait`.
- **Use Clip model for testing**: Always use `lyria-3-clip-preview` (1 credit) when testing/debugging API calls, not the Pro model (3-5 credits). The previous session wasted credits by defaulting to Pro in test scripts.
