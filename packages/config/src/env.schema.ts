import { z } from 'zod';

export const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Telegram
  BOT_TOKEN: z.string().min(1),
  TELEGRAM_CHAT_ID: z.string().optional(),
  WEBHOOK_URL: z.string().optional(),
  WEBHOOK_SECRET: z.string().optional(),

  // Google Cloud
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  VERTEX_AI_LOCATION: z.string().default('us-central1'),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  GCS_BUCKET_NAME: z.string().optional(),
  GCS_PUBLIC_BASE_URL: z.string().optional(),

  // Lyria API (via routerai.ru)
  LYRIA_API_KEY: z.string().min(1),
  LYRIA_BASE_URL: z.string().url().default('https://routerai.ru/api/v1'),

  // Database
  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: z.string().optional(),

  // Supabase
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Redis
  REDIS_URL: z.string().min(1),

  // Storage - Unified interface (MinIO for dev, GCS for prod)
  STORAGE_ENDPOINT: z.string().optional(), // e.g., http://minio:9000
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_PUBLIC_URL: z.string().optional(), // Public URL for direct access

  // Legacy MinIO vars (fallback compatibility)
  MINIO_ENDPOINT: z.string().default('localhost:9000'),
  MINIO_ROOT_USER: z.string().min(1),
  MINIO_ROOT_PASSWORD: z.string().min(1),
  MINIO_BUCKET_NAME: z.string().default('musicai-tracks'),

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

let cachedEnv: Env | null = null;

export function loadEnv(): Env {
  if (cachedEnv) return cachedEnv;
  cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
}
