```markdown
# musicai-bot Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you how to contribute to the `musicai-bot` TypeScript codebase, which implements a music-focused bot with AI integrations. You'll learn the project's coding conventions, how to add new bot commands, integrate external AI APIs, and fix related issues. The guide also covers file organization, code style, and common development workflows, with practical examples and suggested commands for each task.

## Coding Conventions

- **Language:** TypeScript
- **Framework:** None detected
- **File Naming:** Use `camelCase` for file names.
  - Example: `lyricsCommand.ts`, `geminiClient.ts`
- **Import Style:** Use relative imports.
  ```typescript
  import { handleLyrics } from './lyricsCommand';
  ```
- **Export Style:** Use named exports.
  ```typescript
  // In lyricsCommand.ts
  export function handleLyrics() { ... }
  ```
- **Commit Messages:** Follow [Conventional Commits](https://www.conventionalcommits.org/).
  - Prefixes: `feat`, `fix`
  - Example: `feat: add lyrics editing command`

## Workflows

### Add New Bot Command
**Trigger:** When you want to add a new command or feature to the bot (e.g., `/lyrics`, lyrics editing, inline query).
**Command:** `/new-bot-command`

1. **Create or update a command handler**  
   Add a new file in `apps/bot/src/commands` or `apps/bot/src/inline`:
   ```typescript
   // apps/bot/src/commands/lyricsCommand.ts
   export function handleLyrics(ctx) {
     // Command logic here
   }
   ```
2. **Register the new command or handler**  
   Update `apps/bot/src/bot.ts`:
   ```typescript
   import { handleLyrics } from './commands/lyricsCommand';
   bot.command('lyrics', handleLyrics);
   ```
3. **Update session or state handling as needed**  
   Modify `apps/bot/src/main.ts` or related files to manage any new state.
4. **Implement user interaction logic**  
   Add callbacks or button handlers if necessary.

### Integrate External AI API
**Trigger:** When you want to add or update an external AI service for text or music generation.
**Command:** `/integrate-ai-api`

1. **Create or update client class**  
   In `packages/vertex-ai/src`, add or modify a client:
   ```typescript
   // packages/vertex-ai/src/geminiClient.ts
   export class GeminiClient { ... }
   ```
2. **Export the client**  
   Update `packages/vertex-ai/src/index.ts`:
   ```typescript
   export * from './geminiClient';
   ```
3. **Update or add error handling**  
   Implement error mapping or circuit breaker patterns as needed.
4. **Update dependencies**  
   Modify `package.json` in `packages/vertex-ai` and/or `apps/bot` if new dependencies are required.
5. **Update bot command handlers**  
   Use the new/updated client in relevant command files.

### Fix AI API Integration
**Trigger:** When you need to resolve bugs or update configuration for AI API clients.
**Command:** `/fix-ai-api`

1. **Update client implementation or configuration**  
   Edit files in `packages/vertex-ai/src/*.ts` to fix issues (e.g., model names, error handling).
2. **Update dependencies if needed**  
   Update `packages/vertex-ai/package.json` if module resolution or dependencies change.

## Testing Patterns

- **Test File Pattern:** Files are named with `*.test.*`.
  - Example: `lyricsCommand.test.ts`
- **Testing Framework:** Not explicitly detected; check existing test files for framework usage.
- **Test Location:** Tests are typically placed alongside the code or in a dedicated test directory.

## Commands

| Command            | Purpose                                                      |
|--------------------|--------------------------------------------------------------|
| /new-bot-command   | Add a new bot command or feature                             |
| /integrate-ai-api  | Integrate or update an external AI API client                |
| /fix-ai-api        | Fix issues in AI API integration (bugs, configuration, etc.) |
```
