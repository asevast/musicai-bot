# SPEC15 Gap Analysis — Features Remaining to Implement

**Status:** done
**Branch:** dev
**Worktree:** none
**Mode:** hands-off

## Design

### Purpose
Systematic comparison of SPEC15.md against the current codebase to identify unimplemented features, partial implementations, and spec deviations. This is an audit, not an implementation plan.

### Methodology
Read every section of SPEC15.md, traced each requirement against actual source files, and classified gaps as: **Missing** (no code exists), **Partial** (some code but incomplete vs spec), or **Deviation** (implemented differently from spec).

---

### GAP 1 — Referral Program (SPEC §9.4) — MISSING

The `User` model has `referredById` field, but it is **never populated**. The `/start` command ignores the `ref=<userId>` deep-link parameter. No +5 bonus credits for invitee, no 20% kickback for inviter on first purchase.

**Files affected:** `apps/bot/src/commands/start.command.ts`, `apps/api/src/modules/users/users.service.ts`

---

### GAP 2 — i18n Middleware (SPEC §5, §6) — MISSING

Spec defines `i18n.middleware.ts` in the bot middleware chain (`auth → rateLimit → session → i18n`). No i18n middleware exists. All user-facing text is hardcoded English with occasional Russian. No localization framework.

**Files affected:** New file `apps/bot/src/middleware/i18n.middleware.ts`

---

### GAP 3 — Bot Rate-Limiting Middleware (SPEC §5, §11.2) — PARTIAL

A `rate-limiter.ts` utility and test exist in `apps/bot/src/utils/`, but it is **not wired as middleware** in `bot.ts`. The bot has no per-user rate limiting. The API has rate-limit middleware (`apps/api/src/middleware/rate-limit.middleware.ts`), but the bot does not enforce the spec limits (5 generate/min, 30 commands/min).

**Files affected:** `apps/bot/src/bot.ts`, `apps/bot/src/middleware/rate-limit.middleware.ts`

---

### GAP 4 — Negative Prompt in Create Scene (SPEC §6.2 Step 5) — MISSING

The `Track` model stores `negativePrompt`, regeneration preserves it, but the **create-track scene** and **image-to-music scene** do not expose a negative prompt input step. Users cannot set it during creation.

**Files affected:** `apps/bot/src/scenes/create-track.scene.ts`, `apps/bot/src/commands/image-to-music.command.ts`, `apps/bot/src/keyboards/track-options.keyboard.ts`

---

### GAP 5 — Batch / 3-Variant Clip Generation (SPEC §13.3) — MISSING

Spec describes a `[🎲 Три варианта клипа]` button generating 3 sequential clips (3 credits = 3×1 Clip), then presenting all 3 with selection buttons. No `batchGroupId`, `batchIndex`, `batchTotal` fields in `SynthJobPayload`. No batch handling anywhere.

**Files affected:** `packages/shared-types/src/job.types.ts`, `apps/api/src/modules/tracks/tracks.service.ts`, `apps/worker/src/processors/synth-job.processor.ts`, `apps/bot/src/keyboards/track-options.keyboard.ts`

---

### GAP 6 — Repository Pattern (SPEC §5) — DEVIATION

Spec requires all DB access through `*.repository.ts` files; services should never call Prisma directly. Currently **every service** calls `prisma.*` directly (e.g., `prisma.track.findMany()` in `TracksService`, `CreditsService`, `PaymentsService`). No repository layer exists.

**Files affected:** All service files in `apps/api/src/modules/`

---

### GAP 7 — DLQ Handling (SPEC §7.1, §7.3) — PARTIAL

The `synth-dlq` queue is defined in `packages/queues/src/queues.config.ts` but has **no processor**. Failed jobs after max attempts are not moved to DLQ. The `SynthJobProcessor` catches failures and refunds credits but does not add jobs to the DLQ queue.

**Files affected:** `apps/worker/src/processors/synth-job.processor.ts`, new `apps/worker/src/processors/dlq.processor.ts`

---

### GAP 8 — OpenTelemetry Tracing (SPEC §1, §11.3) — MISSING

No `@opentelemetry` imports anywhere. No metrics collection for `synth_job_duration_ms`, `synth_job_queue_depth`, `vertex_api_errors_total`, etc. No alerting integration.

**Files affected:** New instrumentation files across all apps

---

### GAP 9 — Pino Logging (SPEC §1) — DEVIATION

Spec lists Pino (`^9`) as the logging library. All apps use `console.log`/`console.error` throughout. No structured logging.

**Files affected:** All apps — replace console.* with pino logger

---

### GAP 10 — Revised Prompt from Lyria API — DEVIATION

`LyriaClient.generate()` returns `revisedPrompt: req.prompt` (the original prompt) instead of the actual revised prompt from the API. The streaming proxy response may contain a revised prompt in the final chunk, but it is not parsed.

**Files affected:** `packages/vertex-ai/src/lyria.client.ts`

---

### GAP 11 — Terraform / Infrastructure as Code (SPEC §12 Stage 5, §14) — MISSING

`infra/terraform/` directory does not exist. No IaC for Cloud Run + Cloud SQL + Memorystore + GCS.

**Files affected:** New `infra/terraform/` directory

---

### GAP 12 — YuKassa & Stripe Payment Providers (SPEC §9.3) — MISSING

Env vars are defined in config schema. `PaymentsService` only handles Telegram Stars. No YuKassa or Stripe integration code exists.

**Files affected:** `apps/api/src/modules/payments/`, `apps/bot/src/payments/`

---

### GAP 13 — Webapp: Genre Selection Component (SPEC §15.3) — MISSING

Spec defines `PromptForm/GenreSelect.tsx`. The webapp has `PromptForm/index.tsx` but no `GenreSelect.tsx`. Users type genres as free text.

**Files affected:** New `apps/webapp/src/components/PromptForm/GenreSelect.tsx`

---

### GAP 14 — Webapp: BpmSlider Component (SPEC §15.3) — DEVIATION

Spec defines `PromptForm/BpmSlider.tsx`. A generic `Slider` component exists but no dedicated BPM slider with 60-200 range and labels.

**Files affected:** New `apps/webapp/src/components/PromptForm/BpmSlider.tsx`

---

### GAP 15 — Webapp: IntensityPicker Component (SPEC §15.3) — MISSING

Spec defines `PromptForm/IntensityPicker.tsx`. Does not exist in the webapp.

**Files affected:** New `apps/webapp/src/components/PromptForm/IntensityPicker.tsx`

---

### GAP 16 — Webapp: LyricsEditor Component (SPEC §15.3) — MISSING

Spec defines `PromptForm/LyricsEditor.tsx`. The webapp has `Textarea` component but no dedicated lyrics editor with AI generation integration.

**Files affected:** New `apps/webapp/src/components/PromptForm/LyricsEditor.tsx`

---

### GAP 17 — Webapp: CreditsBadge Component (SPEC §15.3) — PARTIAL

A `CreditsBadge.d.ts` declaration exists but the actual `CreditsBadge.tsx` is missing from the components directory (only the `.d.ts` file).

**Files affected:** `apps/webapp/src/components/CreditsBadge.tsx`

---

### GAP 18 — Webapp: TrackGrid Component (SPEC §15.3) — PARTIAL

Same as above — `.d.ts` exists but actual implementation appears to be either stubbed or the declaration is stale.

**Files affected:** `apps/webapp/src/components/TrackGrid.tsx`

---

### GAP 19 — Webapp: Settings Page — MISSING

No `/settings` route in the webapp `App.tsx`. The bot has `/settings` but the Mini App does not.

**Files affected:** `apps/webapp/src/App.tsx`, new `apps/webapp/src/pages/Settings.tsx`

---

### GAP 20 — Webapp: Delete Account Page — MISSING

No `/delete` or settings-based account deletion UI in the webapp. Only the bot supports `/delete_account`.

**Files affected:** New page or section within Settings

---

### GAP 21 — Webapp in Docker (SPEC §15.10) — MISSING

No `webapp` service in `docker-compose.yml`. No `webapp` target in `infra/docker/Dockerfile.dev`.

**Files affected:** `docker-compose.yml`, `infra/docker/Dockerfile.dev`

---

### GAP 22 — Duration Controls in Create Scene (SPEC §6.2 Step 5) — MISSING

The create-track scene has no step for specifying `durationSeconds` (30-184 for Pro model). Pro tracks are created without duration control — the API supports it but the bot UI does not expose it.

**Files affected:** `apps/bot/src/scenes/create-track.scene.ts`

---

### GAP 23 — Monthly Credit Refresh for Subscriptions — MISSING

Pro subscription grants 150 credits on purchase but there is **no recurring monthly credit refresh**. No cron/background job checks subscription expiry or refreshes credits monthly.

**Files affected:** New scheduled job or worker processor

---

### GAP 24 — Content Filter for Prompts (SPEC §11.4) — MISSING

Spec requires content filtering of prompts before sending to Vertex AI. No content moderation layer exists.

**Files affected:** New middleware or service in API/worker

---

### GAP 25 — Circuit Breaker Threshold (SPEC §5) — DEVIATION

Spec says "3 consecutive 500s → open for 30s". Implementation uses `failureThreshold: 5` and `timeout: 60_000` (60s).

**Files affected:** `packages/vertex-ai/src/lyria.client.ts`

---

### GAP 26 — Webapp: BuyCredits Native Telegram Payment — PARTIAL

The `BuyCredits` page exists but it's unclear whether it triggers the native Telegram Stars payment flow or just shows a catalog. The webapp should call `openInvoice` from TMA SDK.

**Files affected:** `apps/webapp/src/pages/BuyCredits.tsx`

---

### GAP 27 — Library with Pagination and Audio (SPEC §6.1) — PARTIAL

`/library` command shows a plain text list of tracks. No pagination, no inline audio play buttons, no track preview. Spec describes paginated library with download buttons.

**Files affected:** `apps/bot/src/commands/library.command.ts`

---

### GAP 28 — `/start` Deep Link Referral Parsing — MISSING

`/start` command does not parse `ref=` parameter from deep links (`/start?ref=<userId>`). Required for referral program (GAP 1).

**Files affected:** `apps/bot/src/commands/start.command.ts`

---

### GAP 29 — Webapp: Cloudflare Pages Deploy (SPEC §15.9) — MISSING

No Cloudflare Pages deployment workflow. No `deploy-webapp.yml` workflow file.

**Files affected:** New `.github/workflows/deploy-webapp.yml`

---

### GAP 30 — Queue Depth Monitoring / User ETA (SPEC §13.4) — MISSING

Spec describes notifying users when `queue_depth > 5` with estimated wait time. No queue depth monitoring or user-facing ETA calculation.

**Files affected:** `apps/worker/src/processors/synth-job.processor.ts`

---

### Summary Table

| # | Gap | Severity | Spec Section |
|---|-----|----------|-------------|
| 1 | Referral program | Medium | §9.4 |
| 2 | i18n middleware | Medium | §5, §6 |
| 3 | Bot rate-limiting | Medium | §5, §11.2 |
| 4 | Negative prompt in create | Low | §6.2 |
| 5 | 3-variant batch clips | Medium | §13.3 |
| 6 | Repository pattern | Low (architectural) | §5 |
| 7 | DLQ handling | Medium | §7.1, §7.3 |
| 8 | OpenTelemetry | High | §1, §11.3 |
| 9 | Pino logging | Medium | §1 |
| 10 | Revised prompt from API | Low | §3.4 |
| 11 | Terraform IaC | High | §12, §14 |
| 12 | YuKassa/Stripe payments | Medium | §9.3 |
| 13 | GenreSelect component | Low | §15.3 |
| 14 | BpmSlider component | Low | §15.3 |
| 15 | IntensityPicker component | Low | §15.3 |
| 16 | LyricsEditor component | Low | §15.3 |
| 17 | CreditsBadge component | Low | §15.3 |
| 18 | TrackGrid component | Low | §15.3 |
| 19 | Webapp settings page | Medium | §15.3 |
| 20 | Webapp delete account | Low | §15.3 |
| 21 | Webapp in Docker | Medium | §15.10 |
| 22 | Duration controls in create | Medium | §6.2 |
| 23 | Monthly credit refresh | High | §9.1 |
| 24 | Content filter for prompts | Medium | §11.4 |
| 25 | Circuit breaker threshold | Low | §5 |
| 26 | Webapp native payment | Medium | §15.6 |
| 27 | Library with pagination | Medium | §6.1 |
| 28 | Deep link referral parsing | Medium | §9.4 |
| 29 | Cloudflare Pages deploy | Medium | §15.9 |
| 30 | Queue depth monitoring | Low | §13.4 |

### Invariants

- IV1: The analysis is based on SPEC15.md §1–§15, not on earlier spec versions
- IV2: "Missing" means zero code; "Partial" means some code exists but doesn't meet spec; "Deviation" means code exists but differs from spec

### Principles

- PC1: Focus on user-visible features first, infrastructure second
- PC2: Gaps are independent — fixing one does not block fixing another

### Assumptions

- AS1: The codebase on branch `dev` represents the current state of all implemented features
- AS2: SPEC15.md is the authoritative spec; deviations from it are gaps by definition

### Unknowns

- UK1: Whether the webapp redesign task (`docs/tasks/webapp-design.md`) will address some of the webapp gaps (#13–18, #19, #20) — likely yes
- UK2: Whether YuKassa/Stripe integration is still desired given Telegram Stars works natively
- UK3: Whether Terraform IaC is a priority or if manual GCP setup is acceptable for now

## Plan

This is an audit task — no implementation plan. The gap list above serves as input for prioritizing future work.

## Verify

N/A — audit task, verified by reading source files against spec.

## Conclusion

### Hands-off decisions

- size: medium — full gap analysis across all spec sections, no code changes
- branch: current branch (dev) — audit only, no code modifications
- uplan/uexecute/uverify/ureview: skipped — this is a research/audit task, not an implementation task

### Deferred (needs user input)

- Which gaps to prioritize for implementation next?
- Whether some gaps should be closed as "wontfix" (e.g., Terraform if manual setup is OK, YuKassa if Stars is enough)
- Whether the webapp redesign task covers webapp-related gaps
