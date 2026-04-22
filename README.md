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

## Docker

### Build images

```bash
docker build -f infra/docker/Dockerfile.bot -t musicai-bot .
docker build -f infra/docker/Dockerfile.api -t musicai-api .
docker build -f infra/docker/Dockerfile.worker -t musicai-worker .
```

### Run with Docker Compose

```bash
docker-compose up
```

## Commands

| Command           | Description                      |
| ----------------- | -------------------------------- |
| `/start`          | Register and get welcome message |
| `/create`         | Create a new track               |
| `/history`        | View your track history          |
| `/library`        | Browse community tracks          |
| `/profile`        | View your profile                |
| `/settings`       | Configure defaults               |
| `/buy`            | Buy credits                      |
| `/delete_account` | Delete account (GDPR)            |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│                                                              │
│   Telegram User ──► grammY Bot (Webhook)                    │
│                         │                                    │
│                    Middleware Chain:                          │
│                    auth → rateLimit → session → i18n         │
└─────────────────────────┬────────────────────────────────────┘
                          │ HTTP / Events
┌─────────────────────────▼────────────────────────────────────┐
│                    APPLICATION LAYER                          │
│                                                              │
│   NestJS API (Cloud Run)                                     │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│   │ Tracks   │ │ Users    │ │ Credits  │ │Payments  │      │
│   │ Module   │ │ Module   │ │ Module   │ │ Module   │      │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│         │                                                    │
│   BullMQ Producer ──► Redis Queue                           │
│                             │                                │
│                    BullMQ Workers (Cloud Run Jobs)           │
│                    ┌────────────────────┐                    │
│                    │ SynthJobProcessor  │                    │
│                    │  - Call Lyria 3    │                    │
│                    │  - Upload GCS      │                    │
│                    │  - Notify User     │                    │
│                    └────────────────────┘                    │
└──────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                        │
│                                                              │
│   PostgreSQL 16    Redis (Dragonfly)    Google Cloud Storage │
│   (Cloud SQL)      (Memorystore)        (MP3 files)          │
│                                                              │
│   Vertex AI ──────────────────────────────────────────────  │
│   lyria-3-pro-preview / lyria-3-clip-preview                 │
└──────────────────────────────────────────────────────────────┘
```

## License

MIT
EOF
