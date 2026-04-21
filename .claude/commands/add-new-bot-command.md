---
name: add-new-bot-command
description: Workflow command scaffold for add-new-bot-command in musicai-bot.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-new-bot-command

Use this workflow when working on **add-new-bot-command** in `musicai-bot`.

## Goal

Adds a new bot command or feature, including command handler, integration in main bot logic, and user interaction handling.

## Common Files

- `apps/bot/src/bot.ts`
- `apps/bot/src/commands/*.ts`
- `apps/bot/src/inline/*.ts`
- `apps/bot/src/main.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update command handler file in apps/bot/src/commands or apps/bot/src/inline
- Update apps/bot/src/bot.ts to register the new command or handler
- Update session or state handling as needed in apps/bot/src/main.ts or related files
- Implement user interaction logic (callbacks, button handlers, etc.)

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.