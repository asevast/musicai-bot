---
name: integrate-external-ai-api
description: Workflow command scaffold for integrate-external-ai-api in musicai-bot.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /integrate-external-ai-api

Use this workflow when working on **integrate-external-ai-api** in `musicai-bot`.

## Goal

Implements or updates integration with an external AI API (e.g., Gemini, Lyria), including new client classes, error handling, and dependency management.

## Common Files

- `packages/vertex-ai/src/*.ts`
- `packages/vertex-ai/src/index.ts`
- `packages/vertex-ai/package.json`
- `apps/bot/package.json`
- `apps/bot/src/commands/*.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update client class in packages/vertex-ai/src (e.g., gemini.client.ts, lyria.client.ts)
- Export client in packages/vertex-ai/src/index.ts
- Update or add error handling (e.g., circuit breaker, error mapping)
- Update dependencies in relevant package.json files
- Update bot command handlers to use new/updated client

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.