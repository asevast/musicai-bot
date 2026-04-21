import 'reflect-metadata';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root only if env vars not already set (host dev)
// In Docker, env vars are set via env_file in docker-compose.yml
if (!process.env.BOT_TOKEN) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  dotenv.config({ path: resolve(__dirname, '../../../.env') });
}

import { Bot, MemorySessionStorage } from 'grammy';
import { loadEnv } from '@musicai/config';
import { prisma } from '@musicai/database';
import { setupBot, type BotContext } from './bot';
import { createServer } from 'http';

interface TelegramUpdate {
  update_id: number;
  message?: any;
  edited_message?: any;
  callback_query?: any;
}

const env = loadEnv();

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

async function main() {
  console.log('[MAIN] Starting bot...');
  console.log('[MAIN] BOT_TOKEN:', env.BOT_TOKEN ? 'set' : 'MISSING');
  console.log('[MAIN] DATABASE_URL:', env.DATABASE_URL ? 'set' : 'MISSING');
  console.log('[MAIN] WEBHOOK_URL:', env.WEBHOOK_URL || 'not set (polling)');

  const bot = new Bot<BotContext>(env.BOT_TOKEN);
  console.log('[MAIN] Bot instance created');

  console.log('[MAIN] Calling setupBot...');
  setupBot(bot);
  console.log('[MAIN] setupBot complete');

  console.log('[MAIN] Calling bot.init()...');
  await bot.init();
  console.log('[MAIN] bot.init() done');

  console.log('[MAIN] Bot ready to start polling...');
  console.log('[MAIN] Bot initialized, botInfo:', bot.botInfo);
  console.log('[MAIN] Bot setup complete');

  if (env.WEBHOOK_URL) {
    console.log(`[MAIN] Setting webhook to ${env.WEBHOOK_URL}...`);

    await bot.api.deleteWebhook();

    await bot.api.setWebhook(env.WEBHOOK_URL, {
      secret_token: env.WEBHOOK_SECRET,
    });
    console.log(`[MAIN] Webhook set to ${env.WEBHOOK_URL}`);

    const server = createServer(async (req, res) => {
      console.log(`[SERVER] Received ${req.method} ${req.url}`);
      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
        return;
      }
      if (req.method === 'POST' && req.url === '/music') {
        try {
          let body = '';
          for await (const chunk of req) {
            body += chunk;
          }
          console.log('[SERVER] Processing update, body length:', body.length);
          const update: TelegramUpdate = JSON.parse(body);
          console.log('[SERVER] Update:', JSON.stringify(update).substring(0, 200));
          await bot.handleUpdate(update as any);
          console.log('[SERVER] Update handled successfully');
          res.writeHead(200);
          res.end('OK');
        } catch (err) {
          console.error('[SERVER] Webhook error:', err);
          res.writeHead(500);
          res.end('Error');
        }
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    server.on('error', (err: any) => {
      console.error('[SERVER] Server error:', err.message);
    });

    const PORT = Number(process.env.BOT_PORT) || 3001;

    return new Promise<void>((resolve) => {
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`Bot server listening on http://0.0.0.0:${PORT}`);
        resolve();
      });
    });
  } else {
    const retryWithBackoff = async () => {
      let delay = 1000;
      while (true) {
        try {
          console.log('[MAIN] Starting long polling...');
          await bot.start();
          console.log(`[MAIN] Bot started as @${bot.botInfo.username}`);
          return;
        } catch (err) {
          console.error('[MAIN] Polling error:', err);
          console.log(`[MAIN] Retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          delay = Math.min(delay * 2, 60000);
        }
      }
    };
    await retryWithBackoff();
  }
}

main()
  .then(() => {
    console.log('[MAIN] Bot running - press Ctrl+C to stop');
    process.stdin.resume();
  })
  .catch((err) => {
    console.error('[MAIN] Bot fatal error:', err);
    console.error('[MAIN] Stack:', err?.stack);
    prisma.$disconnect().catch(() => {});
    process.exit(1);
  });

process.on('SIGINT', () => {
  console.log('[MAIN] Received SIGINT, shutting down gracefully...');
  prisma.$disconnect().catch(() => {});
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[MAIN] Received SIGTERM, shutting down gracefully...');
  prisma.$disconnect().catch(() => {});
  process.exit(0);
});

process.on('exit', (code) => {
  console.log(`[MAIN] Process exiting with code ${code}`);
});
