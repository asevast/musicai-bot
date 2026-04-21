# SPEC: MusicAI Telegram Bot — Google Lyria 3

> **Версия:** 1.1 | **Дата:** Апрель 2026 | **Статус:** Ready for implementation
>
> Telegram-бот для генерации музыки и полных песен на базе **Google Lyria 3 API (Vertex AI)**.
> Аналог Suno AI — текст/изображение → MP3 трек до 3 минут с вокалом.

---

## Содержание

1. [Технологический стек](#1-технологический-стек)
2. [Структура репозитория](#2-структура-репозитория)
3. [API Google Lyria 3](#3-api-google-lyria-3)
4. [Схема базы данных](#4-схема-базы-данных)
5. [Архитектура системы](#5-архитектура-системы)
6. [Telegram Bot — команды и сценарии](#6-telegram-bot--команды-и-сценарии)
7. [BullMQ — очередь задач](#7-bullmq--очередь-задач)
8. [Сервисный слой (NestJS)](#8-сервисный-слой-nestjs)
9. [Монетизация и кредиты](#9-монетизация-и-кредиты)
10. [Конфигурация и ENV](#10-конфигурация-и-env)
11. [Нефункциональные требования](#11-нефункциональные-требования)
12. [Этапы разработки](#12-этапы-разработки)
13. [Известные ограничения API и workarounds](#13-известные-ограничения-api-и-workarounds)

---

## 1. Технологический стек

| Слой                 | Технология                  | Версия  | Пакет                     |
| -------------------- | --------------------------- | ------- | ------------------------- |
| **Telegram Bot**     | grammY                      | `^1.30` | `grammy`                  |
| **Backend**          | NestJS                      | `^11`   | `@nestjs/core`            |
| **Язык**             | TypeScript                  | `^5.4`  | —                         |
| **Job Queue**        | BullMQ                      | `^5`    | `bullmq`                  |
| **ORM**              | Prisma                      | `^6`    | `prisma`                  |
| **Database**         | PostgreSQL                  | `^16`   | `pg`                      |
| **Cache / Sessions** | Redis (Dragonfly)           | `^8`    | `ioredis`                 |
| **Object Storage**   | Google Cloud Storage        | latest  | `@google-cloud/storage`   |
| **AI API**           | Vertex AI (Lyria 3)         | latest  | `@google-cloud/vertexai`  |
| **Validation**       | Zod + class-validator       | latest  | `zod`                     |
| **Logging**          | Pino                        | `^9`    | `pino`                    |
| **Tracing**          | OpenTelemetry               | latest  | `@opentelemetry/sdk-node` |
| **Testing**          | Jest + Testcontainers       | latest  | `jest`                    |
| **CI/CD**            | GitHub Actions + Cloud Run  | —       | —                         |
| **Monorepo**         | Turborepo + pnpm workspaces | latest  | —                         |

---

## 2. Структура репозитория

```
musicai-bot/
├── apps/
│   ├── bot/                        # grammY Telegram Bot
│   │   ├── src/
│   │   │   ├── main.ts             # Entry point, webhook setup
│   │   │   ├── bot.ts              # Bot instance, middleware chain
│   │   │   ├── commands/
│   │   │   │   ├── start.command.ts
│   │   │   │   ├── create.command.ts
│   │   │   │   ├── history.command.ts
│   │   │   │   ├── profile.command.ts
│   │   │   │   ├── buy.command.ts
│   │   │   │   └── settings.command.ts
│   │   │   ├── scenes/
│   │   │   │   ├── create-track.scene.ts   # Step-by-step track creation
│   │   │   │   ├── custom-lyrics.scene.ts
│   │   │   │   └── image-to-music.scene.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts      # Register/find user
│   │   │   │   ├── rate-limit.middleware.ts
│   │   │   │   └── i18n.middleware.ts
│   │   │   ├── keyboards/
│   │   │   │   ├── main-menu.keyboard.ts
│   │   │   │   ├── track-options.keyboard.ts
│   │   │   │   └── payment.keyboard.ts
│   │   │   └── payments/
│   │   │       ├── stars.handler.ts        # Telegram Stars
│   │   │       └── invoice.builder.ts
│   │   └── package.json
│   │
│   ├── api/                        # NestJS REST API
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── modules/
│   │   │   │   ├── tracks/
│   │   │   │   │   ├── tracks.module.ts
│   │   │   │   │   ├── tracks.service.ts
│   │   │   │   │   ├── tracks.controller.ts
│   │   │   │   │   └── tracks.repository.ts
│   │   │   │   ├── users/
│   │   │   │   ├── payments/
│   │   │   │   └── credits/
│   │   │   └── guards/
│   │   │       └── telegram-auth.guard.ts
│   │   └── package.json
│   │
│   └── worker/                     # BullMQ Workers (отдельный Cloud Run Job)
│       ├── src/
│       │   ├── main.ts
│       │   ├── processors/
│       │   │   ├── synth-job.processor.ts  # Основной воркер генерации
│       │   │   └── notify.processor.ts     # Telegram уведомления
│       │   └── handlers/
│       │       ├── vertex-ai.handler.ts
│       │       └── gcs-upload.handler.ts
│       └── package.json
│
├── packages/
│   ├── database/                   # Prisma schema + migrations + client
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── src/
│   │       └── index.ts            # Re-export PrismaClient
│   │
│   ├── vertex-ai/                  # Lyria 3 client wrapper
│   │   └── src/
│   │       ├── lyria.client.ts
│   │       ├── lyria.types.ts
│   │       └── lyria.errors.ts
│   │
│   ├── shared-types/               # Общие типы/DTOs между apps
│   │   └── src/
│   │       ├── track.types.ts
│   │       ├── user.types.ts
│   │       └── job.types.ts
│   │
│   └── config/                     # Zod-валидация ENV
│       └── src/
│           └── env.schema.ts
│
├── infra/
│   ├── terraform/                  # GCP инфраструктура как код
│   └── docker/
│       ├── Dockerfile.bot
│       ├── Dockerfile.api
│       └── Dockerfile.worker
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── turbo.json
├── pnpm-workspace.yaml
└── docker-compose.yml              # Local dev
```

---

## 3. API Google Lyria 3

### 3.1 Модели

| Model ID               | Макс. длина | Особенности                                    | Квота             |
| ---------------------- | ----------- | ---------------------------------------------- | ----------------- |
| `lyria-3-pro-preview`  | **184 сек** | Full song, duration controls, полная структура | 10 req/min/регион |
| `lyria-3-clip-preview` | **30 сек**  | Быстрое превью, без duration controls          | 10 req/min/регион |

### 3.2 Возможности API

| Возможность             | Pro | Clip |
| ----------------------- | --- | ---- |
| Text to Music           | ✅  | ✅   |
| Image to Music          | ✅  | ✅   |
| Vocal Generation        | ✅  | ✅   |
| Instrumental Mode       | ✅  | ✅   |
| Lyrics Generation (AI)  | ✅  | ✅   |
| User-provided Lyrics    | ✅  | ✅   |
| Negative Prompting      | ✅  | ✅   |
| BPM Controls            | ✅  | ✅   |
| Intensity Controls      | ✅  | ✅   |
| Duration Controls       | ✅  | ❌   |
| Prompt Rewriter         | ✅  | ✅   |
| SynthID Audio Watermark | ✅  | ✅   |

### 3.3 Аудио-спецификация

```
Format:      audio/mp3
Sample Rate: 44 100 Hz
Bitrate:     192 kbps
Clips/req:   1
Max size:    ~4.4 MB (Pro 184s) / ~0.72 MB (Clip 30s)
Languages:   en, de, es, fr, hi, ja, ko, pt
```

### 3.4 Клиент Lyria 3 (`packages/vertex-ai/src/lyria.client.ts`)

```typescript
import { VertexAI } from '@google-cloud/vertexai';

export type LyriaModel = 'lyria-3-pro-preview' | 'lyria-3-clip-preview';

export interface LyriaRequest {
  prompt: string; // до 1000 симв.
  negativePrompt?: string; // до 300 симв.
  model: LyriaModel;
  vocal?: boolean; // default: true
  lyrics?: string; // пользовательские тексты, до 2000 симв.
  bpm?: number; // 60–200
  intensity?: 'low' | 'medium' | 'high' | 'epic';
  durationSeconds?: number; // 30–184, только Pro
  language?: 'en' | 'de' | 'es' | 'fr' | 'hi' | 'ja' | 'ko' | 'pt';
  promptRewriter?: boolean; // default: true
  imageBase64?: string; // для image-to-music
  imageMimeType?: 'image/jpeg' | 'image/png';
}

export interface LyriaResponse {
  audioBase64: string; // base64-encoded MP3
  mimeType: 'audio/mp3';
  revisedPrompt?: string; // если prompt rewriter активен
}

export class LyriaClient {
  private readonly vertexAI: VertexAI;
  private readonly location: string;

  constructor(projectId: string, location = 'us-central1') {
    this.vertexAI = new VertexAI({ project: projectId, location });
    this.location = location;
  }

  async generate(req: LyriaRequest): Promise<LyriaResponse> {
    const model = this.vertexAI.preview.getGenerativeModel({
      model: req.model,
    });

    const parts: object[] = [{ text: req.prompt }];

    if (req.imageBase64 && req.imageMimeType) {
      parts.push({
        inlineData: { mimeType: req.imageMimeType, data: req.imageBase64 },
      });
    }

    const generationConfig: Record<string, unknown> = {
      outputMimeType: 'audio/mp3',
      negativePrompt: req.negativePrompt,
      vocal: req.vocal ?? true,
      lyrics: req.lyrics,
      bpm: req.bpm,
      intensity: req.intensity,
      language: req.language ?? 'en',
      promptRewriter: req.promptRewriter ?? true,
    };

    // durationSeconds только для Pro
    if (req.model === 'lyria-3-pro-preview' && req.durationSeconds) {
      generationConfig.durationSeconds = req.durationSeconds;
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig,
    });

    const audioData = result.response.candidates?.[0]?.content?.parts?.[0];
    if (!audioData?.inlineData) {
      throw new LyriaGenerationError('Empty response from Lyria API');
    }

    return {
      audioBase64: audioData.inlineData.data,
      mimeType: 'audio/mp3',
      revisedPrompt: result.response.candidates?.[0]?.content?.parts?.[1]?.text,
    };
  }
}
```

### 3.5 Обработка ошибок Vertex AI

```typescript
// packages/vertex-ai/src/lyria.errors.ts

export enum LyriaErrorCode {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED', // 429 — retry после 60s
  INVALID_ARGUMENT = 'INVALID_ARGUMENT', // 400 — вернуть ошибку юзеру
  PERMISSION_DENIED = 'PERMISSION_DENIED', // 403 — alert DevOps
  INTERNAL = 'INTERNAL', // 500 — retry ×3
  RECITATION_FILTER = 'RECITATION_FILTER', // авторские права в промпте
  VOCAL_LIKENESS = 'VOCAL_LIKENESS', // схожесть с реальным голосом
}

export function mapVertexError(error: unknown): LyriaErrorCode {
  const msg = String(error);
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED'))
    return LyriaErrorCode.QUOTA_EXCEEDED;
  if (msg.includes('400') || msg.includes('INVALID_ARGUMENT'))
    return LyriaErrorCode.INVALID_ARGUMENT;
  if (msg.includes('403') || msg.includes('PERMISSION_DENIED'))
    return LyriaErrorCode.PERMISSION_DENIED;
  if (msg.includes('recitation')) return LyriaErrorCode.RECITATION_FILTER;
  if (msg.includes('vocal_likeness')) return LyriaErrorCode.VOCAL_LIKENESS;
  return LyriaErrorCode.INTERNAL;
}

// Retry-стратегия для воркера
export const RETRY_CONFIG = {
  [LyriaErrorCode.QUOTA_EXCEEDED]: { retry: true, delay: 60_000, maxAttempts: 5 },
  [LyriaErrorCode.INTERNAL]: { retry: true, delay: 5_000, maxAttempts: 3 },
  [LyriaErrorCode.INVALID_ARGUMENT]: { retry: false, delay: 0, maxAttempts: 0 },
  [LyriaErrorCode.PERMISSION_DENIED]: { retry: false, delay: 0, maxAttempts: 0 },
  [LyriaErrorCode.RECITATION_FILTER]: { retry: false, delay: 0, maxAttempts: 0 },
  [LyriaErrorCode.VOCAL_LIKENESS]: { retry: false, delay: 0, maxAttempts: 0 },
} as const;
```

---

## 4. Схема базы данных

```prisma
// packages/database/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum SubscriptionTier {
  free
  pro
  unlimited
}

enum TrackStatus {
  queued
  processing
  done
  failed
}

enum TrackType {
  full_song
  clip
  instrumental
}

enum Intensity {
  low
  medium
  high
  epic
}

enum CreditTxType {
  earn
  spend
  buy
  bonus
  refund
}

// ─── Models ───────────────────────────────────────────────────────────────────

model User {
  id                   String            @id @default(uuid())
  telegramId           BigInt            @unique @map("telegram_id")
  username             String?           @db.VarChar(64)
  firstName            String?           @map("first_name") @db.VarChar(64)
  credits              Int               @default(10)
  subscriptionTier     SubscriptionTier  @default(free) @map("subscription_tier")
  subscriptionExpiresAt DateTime?        @map("subscription_expires_at")
  defaultSettings      Json              @default("{}") @map("default_settings")
  referredById         String?           @map("referred_by_id")
  referredBy           User?             @relation("referrals", fields: [referredById], references: [id])
  referrals            User[]            @relation("referrals")
  tracks               Track[]
  creditTransactions   CreditTransaction[]
  createdAt            DateTime          @default(now()) @map("created_at")
  updatedAt            DateTime          @updatedAt @map("updated_at")

  @@map("users")
}

model Track {
  id               String      @id @default(uuid())
  userId           String      @map("user_id")
  user             User        @relation(fields: [userId], references: [id])
  model            String      @db.VarChar(64)    // lyria-3-pro-preview | lyria-3-clip-preview
  type             TrackType
  prompt           String      @db.Text
  negativePrompt   String?     @map("negative_prompt") @db.Text
  lyrics           String?     @db.Text
  parameters       Json        @default("{}")    // bpm, intensity, duration, language
  status           TrackStatus @default(queued)
  gcsUrl           String?     @map("gcs_url") @db.Text
  durationSec      Int?        @map("duration_sec") @db.SmallInt
  isPublic         Boolean     @default(false) @map("is_public")
  telegramFileId   String?     @map("telegram_file_id") @db.VarChar(256)
  revisedPrompt    String?     @map("revised_prompt") @db.Text
  creditsCharged   Int         @default(0) @map("credits_charged")
  synthJob         SynthJob?
  createdAt        DateTime    @default(now()) @map("created_at")

  @@index([userId, createdAt(sort: Desc)])
  @@index([isPublic, createdAt(sort: Desc)])
  @@map("tracks")
}

model SynthJob {
  id              String    @id @default(uuid())
  trackId         String    @unique @map("track_id")
  track           Track     @relation(fields: [trackId], references: [id])
  bullJobId       String?   @map("bull_job_id") @db.VarChar(128)
  attempts        Int       @default(0) @db.SmallInt
  errorCode       String?   @map("error_code") @db.VarChar(64)
  errorMessage    String?   @map("error_message") @db.Text
  vertexRequestId String?   @map("vertex_request_id") @db.VarChar(256)
  startedAt       DateTime? @map("started_at")
  finishedAt      DateTime? @map("finished_at")
  createdAt       DateTime  @default(now()) @map("created_at")

  @@map("synth_jobs")
}

model CreditTransaction {
  id          String       @id @default(uuid())
  userId      String       @map("user_id")
  user        User         @relation(fields: [userId], references: [id])
  amount      Int                              // +/- кредиты
  type        CreditTxType
  description String       @db.VarChar(255)
  paymentId   String?      @map("payment_id") @db.VarChar(128)
  trackId     String?      @map("track_id") @db.VarChar(64)
  createdAt   DateTime     @default(now()) @map("created_at")

  @@index([userId, createdAt(sort: Desc)])
  @@map("credit_transactions")
}
```

---

## 5. Архитектура системы

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

### Принципы

- **CQRS** — Commands (генерация, покупка) через BullMQ; Queries (история, профиль) напрямую через Prisma
- **Event-driven** — после завершения генерации публикуется событие в Redis Pub/Sub → Bot отправляет трек
- **Circuit Breaker** — обёртка над Vertex AI клиентом; при 3 подряд ошибках 500 — open state на 30s
- **Repository Pattern** — весь доступ к БД через `*.repository.ts`, никогда напрямую из сервисов
- **Hexagonal Architecture** — бизнес-логика не зависит от транспорта (bot/api/worker)

---

## 6. Telegram Bot — команды и сценарии

### 6.1 Таблица команд

| Команда           | Кредиты | Описание                                                         |
| ----------------- | ------- | ---------------------------------------------------------------- |
| `/start`          | 0       | Регистрация + онбординг + выдача 10 стартовых кредитов           |
| `/create`         | 1–5     | Мастер создания трека (step-by-step сцена)                       |
| `/lyrics`         | 1       | Генерация текста песни через Gemini (без музыки)                 |
| `/image_to_music` | 3–5     | Отправить фото → получить трек                                   |
| `/history`        | 0       | История треков с пагинацией (по 5 шт.), inline кнопки скачивания |
| `/library`        | 0       | Публичные треки сообщества                                       |
| `/profile`        | 0       | Баланс кредитов, подписка, статистика, реферальная ссылка        |
| `/buy`            | 0       | Меню покупки кредитов и подписок (Telegram Stars)                |
| `/settings`       | 0       | Дефолты: жанр, язык вокала, BPM, тип трека                       |
| `/delete_account` | 0       | GDPR: удаление аккаунта и всех данных                            |

### 6.2 Сцена создания трека (`create-track.scene.ts`)

```typescript
// Шаги сцены (ConversationScene grammY)
// Каждый шаг ждёт ответа пользователя

Step 1: Выбор типа трека
  → Inline keyboard: [🎵 Полная песня (5 кр)] [✂️ Клип 30с (1 кр)] [🎹 Инструментал (3 кр)]

Step 2: Промпт
  → "Опишите трек: жанр, настроение, инструменты, атмосфера..."
  → Пример: "Lo-fi hip hop, мягкое пианино, vinyl crackle, 75 BPM, для учёбы"
  → Валидация: 10–1000 символов

Step 3: Язык вокала (пропускается для инструментала)
  → Inline keyboard: [🇺🇸 EN] [🇩🇪 DE] [🇪🇸 ES] [🇫🇷 FR] [🇯🇵 JA] [🇰🇷 KO] [🇮🇳 HI] [🇧🇷 PT]

Step 4: Кастомный текст? (опционально)
  → Inline keyboard: [✍️ Ввести свои тексты] [🤖 Сгенерировать автоматически] [⏭ Пропустить]

Step 5: Дополнительные настройки (опционально, кнопка "Расширенные")
  → BPM: ввод числа 60–200 или "Авто"
  → Интенсивность: [Тихая] [Средняя] [Энергичная] [Эпик]
  → Negative prompt: текст

Step 6: Подтверждение + списание кредитов
  → Показать сводку параметров
  → Кнопки: [✅ Создать] [✏️ Изменить] [❌ Отмена]

Step 7: Статус-сообщение
  → "🎵 Создаём трек... ETA ~45 секунд"
  → Редактируется при изменении статуса через Redis Pub/Sub
```

### 6.3 Сообщение с готовым треком

```typescript
// При получении track.completed события:

await ctx.replyWithAudio(track.telegramFileId ?? { source: audioBuffer }, {
  title: track.revisedPrompt?.slice(0, 64) ?? 'MusicAI Track',
  performer: 'MusicAI Bot',
  duration: track.durationSec,
  caption: buildTrackCaption(track),
  reply_markup: buildTrackKeyboard(track),
});

// Кнопки под треком:
// [🔄 Перегенерировать] [📤 Поделиться] [📋 Копировать промпт]
// [🎼 Расширить до 3 мин] (только если clip)  [❤️ В библиотеку]
```

---

## 7. BullMQ — очередь задач

### 7.1 Конфигурация очередей

```typescript
// apps/worker/src/main.ts

const QUEUES = {
  SYNTH_PRO_URGENT: 'synth:pro:urgent', // paid users
  SYNTH_PRO_NORMAL: 'synth:pro:normal', // free users
  SYNTH_CLIP: 'synth:clip',
  SYNTH_DLQ: 'synth:dlq', // dead letter queue
  NOTIFY: 'notify',
} as const;

const queueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { age: 86400, count: 1000 }, // хранить 24h
    removeOnFail: false, // DLQ хранить вечно
  },
};

// Worker concurrency
const workerConfig = {
  [QUEUES.SYNTH_PRO_URGENT]: { concurrency: 2, limiter: { max: 8, duration: 60_000 } },
  [QUEUES.SYNTH_PRO_NORMAL]: { concurrency: 3, limiter: { max: 8, duration: 60_000 } },
  [QUEUES.SYNTH_CLIP]: { concurrency: 5, limiter: { max: 9, duration: 60_000 } },
  [QUEUES.NOTIFY]: { concurrency: 10 },
};
// Суммарно не более 10 req/min к Vertex AI (лимит квоты)
```

### 7.2 SynthJob Payload

```typescript
// packages/shared-types/src/job.types.ts

export interface SynthJobPayload {
  trackId: string;
  userId: string;
  telegramId: string; // для уведомлений
  chatId: number;
  messageId: number; // ID статус-сообщения для редактирования
  lyriaRequest: {
    model: 'lyria-3-pro-preview' | 'lyria-3-clip-preview';
    prompt: string;
    negativePrompt?: string;
    vocal?: boolean;
    lyrics?: string;
    bpm?: number;
    intensity?: 'low' | 'medium' | 'high' | 'epic';
    durationSeconds?: number;
    language?: string;
    imageBase64?: string;
    imageMimeType?: string;
  };
}
```

### 7.3 SynthJobProcessor

```typescript
// apps/worker/src/processors/synth-job.processor.ts

@Processor(QUEUES.SYNTH_PRO_NORMAL)
export class SynthJobProcessor {
  async process(job: Job<SynthJobPayload>): Promise<void> {
    const { trackId, lyriaRequest, chatId, messageId } = job.data;

    // 1. Обновить статус в БД
    await this.tracksRepo.updateStatus(trackId, 'processing');
    await this.synthJobRepo.setStarted(trackId, job.id);

    // 2. Обновить статус-сообщение в Telegram
    await this.notifyQueue.add('status-update', {
      chatId,
      messageId,
      text: '🎵 Генерируем трек... (~40 сек)',
    });

    // 3. Вызов Lyria 3
    let lyriaResponse: LyriaResponse;
    try {
      lyriaResponse = await this.lyriaClient.generate(lyriaRequest);
    } catch (err) {
      const errorCode = mapVertexError(err);
      const retryConfig = RETRY_CONFIG[errorCode];

      await this.synthJobRepo.logError(trackId, errorCode, String(err));

      if (!retryConfig.retry) {
        // Финальная ошибка — вернуть кредиты
        await this.creditsService.refund(job.data.userId, trackId);
        await this.tracksRepo.updateStatus(trackId, 'failed');
        await this.notifyQueue.add('track-failed', { chatId, errorCode });
        return;
      }

      // BullMQ retry с кастомным delay
      throw Object.assign(err as Error, {
        attemptsMade: job.attemptsMade,
        opts: { delay: retryConfig.delay },
      });
    }

    // 4. Загрузить в GCS
    const audioBuffer = Buffer.from(lyriaResponse.audioBase64, 'base64');
    const gcsUrl = await this.gcsUploader.upload({
      buffer: audioBuffer,
      filename: `tracks/${trackId}.mp3`,
      contentType: 'audio/mp3',
      metadata: { trackId, userId: job.data.userId },
    });

    // 5. Обновить трек в БД
    await this.tracksRepo.markDone(trackId, {
      gcsUrl,
      revisedPrompt: lyriaResponse.revisedPrompt,
      durationSec: estimateDuration(audioBuffer),
    });

    // 6. Уведомить пользователя через notify queue
    await this.notifyQueue.add('track-completed', {
      chatId,
      messageId,
      trackId,
      gcsUrl,
    });
  }

  // Обработчик провала всех попыток → DLQ
  @OnWorkerEvent('failed')
  async onFailed(job: Job, err: Error): Promise<void> {
    if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
      await this.dlqQueue.add('failed-job', { ...job.data, error: err.message });
      await this.creditsService.refund(job.data.userId, job.data.trackId);
      await this.tracksRepo.updateStatus(job.data.trackId, 'failed');
    }
  }
}
```

### 7.4 Жизненный цикл задания

```
User запрос
    │
    ▼
[queued] ──► BullMQ добавляет job, пользователь получает "⏳ В очереди..."
    │
    ▼
[active] ──► Воркер взял job, вызов Vertex AI API
    │
    ├── SUCCESS ──► [completed] ──► GCS upload → DB update → Telegram sendAudio
    │
    ├── RETRYABLE ERROR ──► delay → [waiting] → [active] (до 5 попыток)
    │
    └── FATAL ERROR / MAX ATTEMPTS ──► [dead] ──► DLQ + refund credits + notify user
```

---

## 8. Сервисный слой (NestJS)

### 8.1 TracksService — создание трека

```typescript
// apps/api/src/modules/tracks/tracks.service.ts

async createTrack(userId: string, dto: CreateTrackDto): Promise<Track> {
  // 1. Проверить кредиты
  const cost = this.calcCost(dto.model, dto.durationSeconds);
  await this.creditsService.assertAndDeduct(userId, cost, 'Генерация трека');

  // 2. Создать Track в БД
  const track = await this.tracksRepo.create({
    userId,
    model: dto.model,
    type: dto.type,
    prompt: dto.prompt,
    negativePrompt: dto.negativePrompt,
    lyrics: dto.lyrics,
    parameters: {
      bpm: dto.bpm,
      intensity: dto.intensity,
      durationSeconds: dto.durationSeconds,
      language: dto.language,
    },
    creditsCharged: cost,
    status: 'queued',
  });

  // 3. Добавить SynthJob в BullMQ
  const queue = this.selectQueue(userId, dto.model);
  const job = await queue.add('synthesize', {
    trackId: track.id,
    userId,
    telegramId: dto.telegramId,
    chatId: dto.chatId,
    messageId: dto.messageId,
    lyriaRequest: {
      model: dto.model,
      prompt: dto.prompt,
      negativePrompt: dto.negativePrompt,
      vocal: dto.type !== 'instrumental',
      lyrics: dto.lyrics,
      bpm: dto.bpm,
      intensity: dto.intensity,
      durationSeconds: dto.durationSeconds,
      language: dto.language ?? 'en',
      imageBase64: dto.imageBase64,
      imageMimeType: dto.imageMimeType,
    },
  } satisfies SynthJobPayload, {
    priority: this.getPriority(userId),
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
  });

  // 4. Сохранить bullJobId
  await this.synthJobRepo.create({ trackId: track.id, bullJobId: job.id });

  return track;
}

private calcCost(model: string, durationSec?: number): number {
  if (model === 'lyria-3-clip-preview') return 1;
  if (!durationSec || durationSec <= 60) return 3;
  return 5; // > 60 сек
}
```

### 8.2 CreditsService

```typescript
async assertAndDeduct(userId: string, amount: number, description: string): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.credits < amount) throw new InsufficientCreditsError(user.credits, amount);
    await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
    });
    await tx.creditTransaction.create({
      data: { userId, amount: -amount, type: 'spend', description },
    });
  });
}

async refund(userId: string, trackId: string): Promise<void> {
  const job = await this.prisma.synthJob.findFirst({
    where: { trackId },
    include: { track: true },
  });
  if (!job?.track.creditsCharged) return;
  await this.addCredits(userId, job.track.creditsCharged, 'refund',
    `Возврат за неудачную генерацию (${trackId.slice(0, 8)})`);
}
```

---

## 9. Монетизация и кредиты

### 9.1 Тарифы

| Тариф         | Цена      | Кредиты/мес        | Лимиты                                |
| ------------- | --------- | ------------------ | ------------------------------------- |
| **Free**      | 0         | 10 при регистрации | Только Clip, 3 трека/день             |
| **Pro**       | 299 ₽/мес | 150                | Pro + Clip, 20 треков/день, приоритет |
| **Unlimited** | 799 ₽/мес | ∞ (50 треков/день) | Все функции + наивысший приоритет     |
| **Pack S**    | 79 ₽      | 20 кредитов        | Не сгорают 1 год                      |
| **Pack M**    | 299 ₽     | 100 кредитов       | Не сгорают 1 год                      |
| **Pack L**    | 699 ₽     | 300 кредитов       | Не сгорают 1 год                      |

### 9.2 Стоимость операций

| Операция                                  | Кредиты         |
| ----------------------------------------- | --------------- |
| Clip 30 сек (`lyria-3-clip-preview`)      | **1**           |
| Pro трек ≤ 60 сек (`lyria-3-pro-preview`) | **3**           |
| Pro трек 61–184 сек                       | **5**           |
| Расширение Clip → Pro                     | **3** (доплата) |
| AI генерация текста (Gemini)              | **1**           |
| Регенерация трека                         | **50% от цены** |

### 9.3 Платёжные провайдеры

```typescript
// Приоритет интеграции:
// 1. Telegram Stars (XTR) — нативная интеграция, без комиссии платёжного агрегатора
// 2. ЮKassa — российские карты и кошельки
// 3. Stripe — международные карты

// Invoice для Telegram Stars
await ctx.api.sendInvoice(ctx.chat.id, {
  title: 'Pack M — 100 кредитов',
  description: '100 кредитов для генерации треков MusicAI',
  payload: JSON.stringify({ type: 'credits', amount: 100, userId }),
  currency: 'XTR', // Telegram Stars
  prices: [{ label: 'Pack M', amount: 299 }],
  provider_token: '', // пустой для Stars
});
```

### 9.4 Реферальная программа

```typescript
// При регистрации по реферальной ссылке /start?ref=<userId>:
// Реферер получает: 20% кредитов от первой покупки приглашённого
// Приглашённый получает: +5 бонусных кредитов при регистрации
```

---

## 10. Конфигурация и ENV

### 10.1 `.env` схема (Zod валидация)

```typescript
// packages/config/src/env.schema.ts

import { z } from 'zod';

export const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.coerce.number().default(3000),

  // Telegram
  BOT_TOKEN: z.string().min(1),
  WEBHOOK_URL: z.string().url().optional(),
  WEBHOOK_SECRET: z.string().min(16).optional(),

  // Google Cloud
  GOOGLE_CLOUD_PROJECT: z.string().min(1),
  VERTEX_AI_LOCATION: z.string().default('us-central1'),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  GCS_BUCKET_NAME: z.string().min(1),
  GCS_PUBLIC_BASE_URL: z.string().url(),

  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_DATABASE_URL: z.string().url().optional(),

  // Redis
  REDIS_URL: z.string().url(),

  // Payments
  YUKASSA_SHOP_ID: z.string().optional(),
  YUKASSA_SECRET_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Limits
  FREE_DAILY_TRACKS_LIMIT: z.coerce.number().default(3),
  PRO_DAILY_TRACKS_LIMIT: z.coerce.number().default(20),
  MAX_PROMPT_LENGTH: z.coerce.number().default(1000),
  MAX_LYRICS_LENGTH: z.coerce.number().default(2000),

  // Rate limiting
  GENERATE_RATE_LIMIT_PER_MIN: z.coerce.number().default(5),
  COMMAND_RATE_LIMIT_PER_MIN: z.coerce.number().default(30),
});

export type Env = z.infer<typeof envSchema>;
```

### 10.2 Google Cloud IAM

```
Service Account минимальные роли:
  - roles/aiplatform.user          → Vertex AI API
  - roles/storage.objectAdmin      → GCS uploads/reads
  - roles/cloudsql.client          → Cloud SQL (если через connector)
  - roles/secretmanager.secretAccessor → Secret Manager (prod)
```

---

## 11. Нефункциональные требования

### 11.1 Производительность

| Метрика                      | Цель                         |
| ---------------------------- | ---------------------------- |
| Время ответа на команды бота | < 500 ms (p95)               |
| ETA Clip в очереди (Free)    | < 120 сек                    |
| ETA Pro в очереди (Paid)     | < 60 сек                     |
| Throughput                   | ≥ 100 одновременных SynthJob |
| Uptime SLA                   | 99.5%                        |
| Размер MP3 (Pro 184s)        | ~4.4 MB                      |

### 11.2 Лимиты и защита

```typescript
// Rate limits per user
GENERATE:  5 req/min
COMMANDS:  30 req/min
UPLOAD:    10 req/min

// Input validation
prompt:        [10, 1000]   символов, sanitize HTML
negativePrompt:[0,  300]    символов
lyrics:        [0,  2000]   символов
bpm:           [60, 200]    целое число
durationSec:   [30, 184]    целое число
imageSize:     ≤ 4 MB,      JPEG/PNG only

// Anti-abuse
- Telegram initData signature verification
- 1 аккаунт = 1 Telegram ID (нельзя обойти)
- Мониторинг аномального расхода кредитов
```

### 11.3 Мониторинг

```typescript
// Ключевые метрики (OpenTelemetry → Grafana)
metrics:
  - synth_job_duration_ms          // histogram, by model
  - synth_job_queue_depth          // gauge, by queue name
  - vertex_api_errors_total        // counter, by error_code
  - credits_spent_total            // counter
  - telegram_messages_total        // counter, by command
  - active_users_daily             // gauge

// Алерты
alerts:
  - vertex_error_rate > 5%    → PagerDuty
  - queue_depth > 50          → Telegram DevOps chat
  - vertex_quota_usage > 80%  → Telegram DevOps chat
  - p95_response_time > 2s    → Telegram DevOps chat
```

### 11.4 Безопасность

- Все secrets — в Google Secret Manager; в ENV только ссылки
- Никаких credentials в репозитории (`git-secrets` pre-commit hook)
- Команда `/delete_account` → полное удаление данных (GDPR / ФЗ-152)
- Аудит-лог кредитных транзакций — append-only, без UPDATE/DELETE
- Content filter промптов перед отправкой в Vertex AI

---

## 12. Этапы разработки

### Этап 1 — MVP: Clip генерация (2 недели)

```
Deliverables:
  □ grammY бот с /start, /create (только clip), /history
  □ NestJS API: users, tracks modules
  □ Prisma schema + migrations
  □ BullMQ worker: lyria-3-clip-preview
  □ GCS upload
  □ PostgreSQL + Redis (docker-compose для dev)
  □ Базовые unit тесты

Acceptance: пользователь вводит промпт → получает MP3 клип в Telegram
```

### Этап 2 — Pro генерация + тексты (2 недели)

```
Deliverables:
  □ lyria-3-pro-preview + duration controls
  □ Сцена custom lyrics (ввод своих текстов)
  □ Image-to-music (/image_to_music команда)
  □ Clip → Pro расширение
  □ Приоритизация очередей (paid vs free)
  □ Retry стратегия + Circuit Breaker
```

### Этап 3 — Монетизация (1 неделя)

```
Deliverables:
  □ Credits система (deduct / refund / transaction log)
  □ Telegram Stars интеграция (/buy)
  □ Тарифные планы Free / Pro / Unlimited
  □ /profile команда
  □ Реферальная программа
```

### Этап 4 — Community + шаринг (1 неделя)

```
Deliverables:
  □ /library — публичная лента треков
  □ Кнопка "❤️ В библиотеку"
  □ Inline режим для шаринга треков
  □ /settings — дефолтные параметры
```

### Этап 5 — DevOps + мониторинг (1 неделя)

```
Deliverables:
  □ Terraform: Cloud Run + Cloud SQL + Memorystore + GCS
  □ GitHub Actions CI/CD
  □ OpenTelemetry → Cloud Monitoring
  □ Grafana дашборды
  □ Load testing (k6): 100 concurrent users
  □ Snyk security scan
```

### Этап 6 — Бета (2 недели)

```
Deliverables:
  □ Онбординг 500+ пользователей
  □ Сбор фидбека + hotfix цикл
  □ Производительность: p95 < 500ms подтверждена под нагрузкой
  □ Production launch
```

---

---

## 13. Известные ограничения API и workarounds

> Раздел обязателен к прочтению перед реализацией редактирования треков.
> Источник: [официальная документация Gemini API](https://ai.google.dev/gemini-api/docs/music-generation)

### 13.1 Подтверждённые ограничения Lyria 3

| #        | Ограничение                                                                                      | Официальный источник                                           | Влияние на бот                                         |
| -------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------ |
| **L-01** | **Нет multi-turn editing** — генерация одноразовая, итеративное редактирование не поддерживается | Gemini API docs: _"Music generation is a single-turn process"_ | Нельзя «поправить» готовый трек — только перегенерация |
| **L-02** | **Нет inpainting** — невозможно заменить отдельную секцию (куплет, припев, 10 секунд)            | Сравнение с Udio (поддерживает inpainting)                     | Замена лирики = перегенерация всего трека              |
| **L-03** | **Нет audio-to-audio** — нельзя загрузить готовый трек и изменить его                            | Только text/image → audio                                      | Нет функции «загрузить свой трек и отредактировать»    |
| **L-04** | **Нет voice cloning** — нельзя загрузить референсный голос                                       | Safety фильтры блокируют имитацию конкретных артистов          | Нет функции «петь голосом X»                           |
| **L-05** | **1 клип за запрос** — batch generation не поддерживается                                        | Spec модели                                                    | Нельзя генерировать 3 варианта одновременно            |
| **L-06** | **Квота 10 req/min** на регион (Vertex AI)                                                       | Vertex AI model card                                           | Требует жёсткого rate-limiting и очереди               |
| **L-07** | **SynthID watermark неудаляем** — присутствует во всех треках, выживает после сжатия             | Google DeepMind                                                | Нельзя убрать даже для платных пользователей           |
| **L-08** | **Preview статус** — Google может изменить API, лимиты или цены без предупреждения               | Pre-GA Terms                                                   | Мониторить changelog, заложить абстракцию над клиентом |

---

### 13.2 L-01 / L-02 — Замена лирики: workaround

**Проблема:** пользователь хочет изменить только текст, сохранив музыку, BPM, стиль.
**Реальность API:** любое изменение = новая генерация с нуля. Музыка будет другой.

#### UX-решение: «Редактировать текст → Переписать трек»

```
Кнопки под треком (после получения готового MP3):

  [🔄 Перегенерировать]   [✏️ Изменить текст]   [📤 Поделиться]

При нажатии [✏️ Изменить текст]:
  Бот: "Текущий текст песни:
        ─────────────────────
        [Verse 1] Walking down the street...
        [Chorus] Oh, the summer rain...
        ─────────────────────
        Введите новый текст или отредактируйте существующий.
        ⚠️ Музыкальная аранжировка будет перегенерирована заново."

  Пользователь вводит новый текст

  Бот: "Запускаем генерацию с новым текстом.
        Параметры сохранены: Pop, 120 BPM, Medium intensity, EN
        Стоимость: 3 кредита (50% скидка от базовой цены)
        [✅ Создать]  [❌ Отмена]"
```

#### Реализация в коде

```typescript
// apps/bot/src/commands/create.command.ts

// Хранить в track.parameters все данные для возможной «регенерации»
interface TrackParameters {
  bpm?: number;
  intensity?: Intensity;
  durationSeconds?: number;
  language?: string;
  // Исходный промпт и тексты сохраняются для re-use
}

// При нажатии кнопки "Изменить текст":
bot.callbackQuery(/^edit_lyrics:(.+)$/, async (ctx) => {
  const trackId = ctx.match[1];
  const track = await tracksRepo.findById(trackId);

  // Показать текущую лирику (если была)
  await ctx.conversation.enter('edit-lyrics', { sourceTrackId: trackId });
});
```

```typescript
// apps/bot/src/scenes/edit-lyrics.scene.ts

export const editLyricsScene = createConversation(async (conv, ctx) => {
  const { sourceTrackId } = conv.session;
  const sourceTrack = await tracksRepo.findById(sourceTrackId);

  // Шаг 1: показать предупреждение об ограничении API
  await ctx.reply(
    `⚠️ *Важно*: Lyria 3 не поддерживает редактирование готового трека.\n` +
      `Будет создан *новый трек* с теми же параметрами, но другим текстом.\n` +
      `Старый трек останется в истории.\n\n` +
      (sourceTrack.lyrics
        ? `*Текущий текст:*\n\`\`\`\n${sourceTrack.lyrics}\n\`\`\``
        : `*Текст предыдущего трека был сгенерирован автоматически.*`),
    { parse_mode: 'Markdown' }
  );

  // Шаг 2: получить новый текст
  await ctx.reply('Введите новый текст песни (или /skip для автогенерации):');
  const { message } = await conv.wait();

  const newLyrics = message?.text === '/skip' ? undefined : message?.text;

  // Шаг 3: подтверждение со стоимостью
  const cost = calcRegenerationCost(sourceTrack); // 50% от оригинала
  await ctx.reply(
    `*Параметры новой генерации:*\n` +
      `• Промпт: ${sourceTrack.prompt}\n` +
      `• BPM: ${sourceTrack.parameters.bpm ?? 'Авто'}\n` +
      `• Язык: ${sourceTrack.parameters.language ?? 'en'}\n` +
      `• Стоимость: ${cost} кредитов\n\n` +
      `Продолжить?`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Создать', callback_data: 'confirm_regen' },
            { text: '❌ Отмена', callback_data: 'cancel' },
          ],
        ],
      },
    }
  );

  const { callbackQuery } = await conv.wait();
  if (callbackQuery?.data !== 'confirm_regen') return;

  // Шаг 4: создать новый трек с теми же параметрами + новой лирикой
  await tracksService.createTrack(ctx.from.id.toString(), {
    ...sourceTrack.parameters,
    model: sourceTrack.model as LyriaModel,
    type: sourceTrack.type as TrackType,
    prompt: sourceTrack.prompt,
    lyrics: newLyrics,
    chatId: ctx.chat!.id,
    messageId: (await ctx.reply('🎵 Создаём трек...')).message_id,
    isRegeneration: true, // для скидки 50%
    sourceTrackId, // ссылка на исходный
  });
});
```

```typescript
// apps/api/src/modules/tracks/tracks.service.ts — расчёт стоимости регенерации

private calcCost(dto: CreateTrackDto): number {
  const base = (() => {
    if (dto.model === 'lyria-3-clip-preview') return 1;
    if (!dto.durationSeconds || dto.durationSeconds <= 60) return 3;
    return 5;
  })();
  // Скидка 50% при регенерации
  return dto.isRegeneration ? Math.max(1, Math.floor(base * 0.5)) : base;
}
```

#### Обновление схемы БД

```prisma
// packages/database/prisma/schema.prisma — добавить в модель Track:

model Track {
  // ... existing fields ...

  isRegeneration   Boolean  @default(false) @map("is_regeneration")
  sourceTrackId    String?  @map("source_track_id") @db.VarChar(64)
  // sourceTrackId — ссылка на трек, из которого выполнена регенерация (для истории)
}
```

---

### 13.3 L-05 — Нет batch: workaround «3 варианта»

**Проблема:** пользователь хочет выбрать из нескольких вариантов трека.
**Решение:** последовательная генерация 3 клипов (Clip модель) → пользователь выбирает → расширение до Pro.

```
UX:
  Кнопка [🎲 Три варианта клипа]  (стоит 3 кредита = 3×1 Clip)

  Бот генерирует 3 SynthJob последовательно (не параллельно — квота!)
  После получения всех трёх отправляет их группой с кнопками:

  [▶️ Слушать 1]  [▶️ Слушать 2]  [▶️ Слушать 3]
  [✅ Выбрать 1]  [✅ Выбрать 2]  [✅ Выбрать 3]
  [🎼 Расширить выбранный до Pro]
```

```typescript
// Реализация: добавить в BullMQ поддержку "группы заданий"

interface SynthJobPayload {
  // ... existing fields ...
  batchGroupId?: string; // UUID группы, если это один из вариантов
  batchIndex?: number; // 0, 1, 2
  batchTotal?: number; // 3
}

// Воркер после завершения каждого задания в группе проверяет:
// все ли задания группы выполнены → отправить все треки разом
```

---

### 13.4 L-06 — Квота 10 req/min: детальная стратегия

```typescript
// packages/vertex-ai/src/rate-limiter.ts

// Vertex AI: 10 req/min = 1 запрос каждые 6 секунд (с запасом — 7 сек)
// Распределение по очередям:

const QUOTA_BUDGET = {
  total: 10, // req/min (hard limit Vertex AI)
  synth_pro_urgent: 3, // для paid users
  synth_pro_normal: 3, // для free users
  synth_clip: 4, // быстрые клипы
} as const;

// BullMQ limiter — применяется к каждой очереди:
// synth:pro:urgent → { max: 3,  duration: 60_000 }
// synth:pro:normal → { max: 3,  duration: 60_000 }
// synth:clip       → { max: 4,  duration: 60_000 }

// При 429 от Vertex AI — дополнительный backoff поверх BullMQ:
// attempt 1: wait 60s
// attempt 2: wait 120s
// attempt 3: wait 240s
// attempt 4+: DLQ + refund

// Уведомление пользователя при длинной очереди:
// queue_depth > 5 → "⏳ Высокая нагрузка, ваш трек готов примерно через N минут"
```

---

### 13.5 Сравнение с конкурентами (для понимания ограничений)

| Функция                            | Lyria 3 (наш бот)    | Suno               | Udio               |
| ---------------------------------- | -------------------- | ------------------ | ------------------ |
| Генерация трека                    | ✅                   | ✅                 | ✅                 |
| Пользовательские тексты            | ✅                   | ✅                 | ✅                 |
| Редактирование секций (inpainting) | ❌ workaround        | ❌                 | ✅                 |
| Multi-turn итерации                | ❌ workaround        | ❌                 | ✅                 |
| Stem export                        | ❌                   | ✅ (платно)        | ✅                 |
| Voice cloning                      | ❌                   | ❌                 | ❌                 |
| Лицензионная чистота данных        | ✅ (Google заявляет) | ⚠️ (судебные иски) | ⚠️ (судебные иски) |
| API для разработчиков              | ✅                   | ✅                 | ⚠️ ограниченно     |
| Цена за трек (API)                 | ~$0.08 (Pro)         | ~$0.05             | —                  |

> **Ключевой вывод для разработки:** отсутствие inpainting — это архитектурное ограничение Lyria 3, а не упущение в нашей реализации. Workaround через «регенерацию с сохранением параметров» даёт пользователю 80% UX от полноценного редактирования при минимальных доработках.

---

## Приложение: Примеры промптов

| Жанр       | Промпт                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------- |
| Pop        | `Upbeat pop song, catchy chorus, female vocals, guitar and synth, 120 BPM, summer vibes`    |
| Hip-Hop    | `Dark trap beat, 808 bass, hi-hats, male rap vocals, aggressive, 140 BPM`                   |
| Cinematic  | `Epic orchestral soundtrack, strings and brass, dramatic tension, no vocals, 90 BPM`        |
| Lo-fi      | `Chill lo-fi hip hop, soft piano, vinyl crackle, mellow female vocals, 75 BPM, study mood`  |
| Electronic | `Progressive house, uplifting synth leads, energetic drop, 128 BPM`                         |
| Jazz       | `Smooth jazz, saxophone lead, brushed drums, upright bass, intimate bar atmosphere, 95 BPM` |

## Приложение: Ссылки

- **Lyria 3 Models:** https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/lyria/lyria-3
- **Generate Music:** https://docs.cloud.google.com/vertex-ai/generative-ai/docs/music/generate-music
- **Prompt Guide:** https://docs.cloud.google.com/vertex-ai/generative-ai/docs/music/music-gen-prompt-guide
- **Lyria Pricing:** https://cloud.google.com/vertex-ai/generative-ai/pricing#lyria
- **grammY:** https://grammy.dev
- **NestJS:** https://nestjs.com
- **BullMQ:** https://docs.bullmq.io
- **Prisma:** https://www.prisma.io
- **Vertex AI TypeScript SDK:** https://github.com/googleapis/nodejs-vertexai

---

_SPEC v1.1 — MusicAI Bot — Google Lyria 3 | Обновлено: добавлен раздел 13 «Ограничения API и workarounds»_
