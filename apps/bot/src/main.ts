import { Bot } from 'grammy';
import { loadEnv } from '@musicai/config';
import { prisma } from '@musicai/database';
import { setupBot } from './bot';

const env = loadEnv();

async function main() {
  const bot = new Bot(env.BOT_TOKEN);
  setupBot(bot);

  if (env.WEBHOOK_URL) {
    await bot.api.setWebhook(env.WEBHOOK_URL, {
      secret_token: env.WEBHOOK_SECRET,
    });
    console.log(`Webhook set to ${env.WEBHOOK_URL}`);
  } else {
    await bot.start();
    console.log(`Bot started as @${bot.botInfo.username}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
