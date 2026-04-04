# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This repository is currently in the **specification phase**. No code has been implemented yet.

## Primary Documentation

**SPEC.md** is the authoritative source for this project. It contains:
- Complete technology stack (grammY, NestJS, BullMQ, Prisma, PostgreSQL, Redis, Google Cloud Storage, Vertex AI Lyria 3)
- Database schema (Prisma)
- System architecture (CQRS, event-driven, hexagonal)
- Telegram bot commands and scenes
- BullMQ job queue configuration
- Monetization and credits system
- Development phases (6 stages, MVP through beta)

## Planned Architecture

```
apps/
├── bot/          # grammY Telegram Bot
├── api/          # NestJS REST API
└── worker/       # BullMQ Workers (Cloud Run Jobs)

packages/
├── database/     # Prisma schema + migrations
├── vertex-ai/    # Lyria 3 client wrapper
├── shared-types/ # Common types/DTOs
└── config/       # Zod ENV validation
```

## Key Constraints

- **Vertex AI quota:** 10 req/min per region (hard limit)
- **Lyria 3 limitations:** No multi-turn editing, no inpainting, no audio-to-audio, no voice cloning
- **Workarounds documented:** See section 13 in SPEC.md for editing lyrics and batch generation

## When Implementation Begins

The project will use:
- **Monorepo:** Turborepo + pnpm workspaces
- **Testing:** Jest + Testcontainers
- **CI/CD:** GitHub Actions + Cloud Run
- **Infrastructure:** Terraform for GCP resources

Refer to SPEC.md section 12 for the 6-stage development roadmap.
