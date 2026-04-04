# MusicAI Telegram Bot

Telegram bot for generating music using Google Lyria 3 API (Vertex AI).

## Tech Stack

- **Bot**: grammY
- **Backend**: NestJS
- **Language**: TypeScript
- **Job Queue**: BullMQ
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Cache**: Redis
- **Storage**: Google Cloud Storage
- **AI**: Vertex AI (Lyria 3)

## Development

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker (for local PostgreSQL and Redis)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start local services:
   ```bash
   docker-compose up -d
   ```

4. Copy `.env.example` to `.env` and configure your environment variables

5. Generate Prisma client:
   ```bash
   pnpm db:generate
   ```

6. Push database schema:
   ```bash
   pnpm db:push
   ```

### Running

- **Bot**: `pnpm --filter @musicai/bot dev`
- **API**: `pnpm --filter @musicai/api dev`
- **Worker**: `pnpm --filter @musicai/worker dev`

### Building

```bash
pnpm build
```

### Testing

```bash
pnpm test
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Register and get welcome message |
| `/create` | Create a new track |
| `/history` | View your track history |
| `/profile` | View your profile |
| `/buy` | Buy credits |

## License

MIT
