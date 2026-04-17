import { Bot, session, InlineKeyboard, InputFile } from 'grammy';
import type { Context } from 'grammy';
import { conversations } from '@grammyjs/conversations';
import { loadEnv } from '@musicai/config';
import { prisma } from '@musicai/database';
import { storageService } from '@musicai/storage';
import { startCommand } from './commands/start.command';
import { createCommand, createTrackScene } from './commands/create.command';
import {
  historyCommand,
  showHistoryPage,
  handleHistoryPage,
  handleHistorySummary,
} from './commands/history.command';
import { helpCommand } from './commands/help.command';
import { profileCommand } from './commands/profile.command';
import { buyCommand } from './commands/buy.command';
import { settingsCommand } from './commands/settings.command';
import { deleteAccountCommand, confirmDeleteAccount } from './commands/delete-account.command';
import { libraryCommand } from './commands/library.command';
import { menuCommand } from './commands/menu.command';
import { fleshCommand } from './commands/flesh.command';
import { buildPaymentInvoice, handleSuccessfulPayment } from './payments/stars.handler';
import {
  mainMenuKeyboard,
  historyMenuKeyboard,
  profileMenuKeyboard,
  settingsMenuKeyboard,
  creditsMenuKeyboard,
  settingsLanguageKeyboard,
  settingsIntensityKeyboard,
  settingsNotificationsKeyboard,
  settingsModelKeyboard,
} from './keyboards/main-menu.keyboard';
import {
  buildSettingsSummary,
  formatIntensity,
  formatLanguage,
  formatModel,
  formatNotifications,
  parseUserSettings,
} from './utils/user-settings';

export type BotContext = Context;

const renderSettingsText = (settings: ReturnType<typeof parseUserSettings>) =>
  `⚙️ *Settings*\n\n${buildSettingsSummary(settings)}\n\nConfigure your preferences:`;

export function setupBot(bot: Bot<BotContext>) {
  bot.use(
    session({
      initial: () => ({}),
    })
  );

  bot.use(conversations());

  bot.use(async (ctx, next) => {
    console.log('Middleware: User update received', ctx.from?.id, ctx.message?.text);
    const telegramId = BigInt(ctx.from?.id ?? 0);
    if (telegramId === 0n) return next();

    let user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId,
          username: ctx.from?.username,
          firstName: ctx.from?.first_name,
          credits: 10,
        },
      });
    }

    ctx.user = user;
    console.log('Middleware: User loaded', user.id);
    return next();
  });

  bot.use(createTrackScene);

  bot.command('start', startCommand);
  bot.command('create', createCommand);
  bot.command('history', historyCommand);
  bot.command('profile', profileCommand);
  bot.command('buy', buyCommand);
  bot.command('settings', settingsCommand);
  bot.command('library', libraryCommand);
  bot.command('delete_account', deleteAccountCommand);
  bot.command('menu', menuCommand);
  bot.command('help', helpCommand);
  bot.command('flesh', fleshCommand);

  bot.callbackQuery('main_menu', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText('🎵 *MusicAI Bot*', {
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard(),
    });
  });

  bot.callbackQuery('create_track', async (ctx) => {
    await ctx.answerCallbackQuery();
    await (ctx as any).conversation?.enter('createTrack');
  });

  bot.callbackQuery('history', async (ctx) => {
    await ctx.answerCallbackQuery();
    await showHistoryPage(ctx, { page: 1, filter: 'all' });
  });

  bot.callbackQuery('profile', async (ctx) => {
    await ctx.answerCallbackQuery();
    try {
      await ctx.editMessageText('👤 *My Profile*\n\nView your stats and info:', {
        parse_mode: 'Markdown',
        reply_markup: profileMenuKeyboard(),
      });
    } catch {
      // Message not modified - ignore
    }
  });

  bot.callbackQuery('settings', async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = ctx.user;
    if (!user) {
      return ctx.reply('Error: User not found');
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { defaultSettings: true },
    });
    const settings = parseUserSettings(dbUser?.defaultSettings);

    try {
      await ctx.editMessageText(renderSettingsText(settings), {
        parse_mode: 'Markdown',
        reply_markup: settingsMenuKeyboard(),
      });
    } catch {
      // Message not modified - ignore
    }
  });

  bot.callbackQuery('buy_credits', async (ctx) => {
    await ctx.answerCallbackQuery();
    try {
      await ctx.editMessageText('💎 *Credits Shop*\n\nChoose a package:', {
        parse_mode: 'Markdown',
        reply_markup: creditsMenuKeyboard(),
      });
    } catch {
      // Message not modified - ignore
    }
  });

  bot.callbackQuery('library', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText('🌍 *Public Library*\n\nBrowse tracks from the community:', {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('⬅️ Back to Menu', 'main_menu'),
    });
  });

  bot.callbackQuery('profile_transactions', async (ctx) => {
    await ctx.answerCallbackQuery();
    const user = ctx.user;
    if (!user) {
      return ctx.reply('Error: User not found');
    }

    const transactions = await prisma.creditTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    let message = '💳 *Recent Transactions*\n\n';

    if (transactions.length === 0) {
      message += 'No transactions yet.';
    } else {
      message += transactions
        .map((transaction) => {
          const sign = transaction.amount >= 0 ? '+' : '';
          const date = transaction.createdAt.toLocaleDateString('en-US');
          return (
            `• *${transaction.type.toUpperCase()}* ${sign}${transaction.amount}\n` +
            `${transaction.description}\n` +
            `${date}`
          );
        })
        .join('\n\n');
    }

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: profileMenuKeyboard(),
    });
  });

  bot.callbackQuery('settings_language', async (ctx) => {
    await ctx.answerCallbackQuery();
    const settings = parseUserSettings(ctx.user?.defaultSettings);
    await ctx.editMessageText(
      `🌐 *Default Language*\n\nCurrent: ${formatLanguage(settings.language)}`,
      {
        parse_mode: 'Markdown',
        reply_markup: settingsLanguageKeyboard(settings.language),
      }
    );
  });

  bot.callbackQuery('settings_intensity', async (ctx) => {
    await ctx.answerCallbackQuery();
    const settings = parseUserSettings(ctx.user?.defaultSettings);
    await ctx.editMessageText(
      `🎚️ *Default Intensity*\n\nCurrent: ${formatIntensity(settings.intensity)}`,
      {
        parse_mode: 'Markdown',
        reply_markup: settingsIntensityKeyboard(settings.intensity),
      }
    );
  });

  bot.callbackQuery('settings_notifications', async (ctx) => {
    await ctx.answerCallbackQuery();
    const settings = parseUserSettings(ctx.user?.defaultSettings);
    await ctx.editMessageText(
      `🔔 *Notifications*\n\nCurrent: ${formatNotifications(settings.notifications)}`,
      {
        parse_mode: 'Markdown',
        reply_markup: settingsNotificationsKeyboard(settings.notifications),
      }
    );
  });

  bot.callbackQuery('settings_model', async (ctx) => {
    await ctx.answerCallbackQuery();
    const settings = parseUserSettings(ctx.user?.defaultSettings);
    await ctx.editMessageText(`🎭 *Default Model*\n\nCurrent: ${formatModel(settings.model)}`, {
      parse_mode: 'Markdown',
      reply_markup: settingsModelKeyboard(settings.model),
    });
  });

  const updateUserSettings = async (
    ctx: BotContext,
    nextSettings: Partial<ReturnType<typeof parseUserSettings>>,
    confirmation: string
  ) => {
    const user = ctx.user;
    if (!user) {
      return ctx.reply('Error: User not found');
    }

    const currentSettings = parseUserSettings(user.defaultSettings);
    const mergedSettings = { ...currentSettings, ...nextSettings };

    await prisma.user.update({
      where: { id: user.id },
      data: { defaultSettings: mergedSettings },
    });

    await ctx.answerCallbackQuery(confirmation);
    await ctx.editMessageText(renderSettingsText(mergedSettings), {
      parse_mode: 'Markdown',
      reply_markup: settingsMenuKeyboard(),
    });
  };

  bot.callbackQuery(/^set_language_/, async (ctx) => {
    const language = ctx.callbackQuery.data.replace('set_language_', '');
    await updateUserSettings(ctx, { language }, `Language set to ${formatLanguage(language)}`);
  });

  bot.callbackQuery(/^set_intensity_/, async (ctx) => {
    const intensity = ctx.callbackQuery.data.replace('set_intensity_', '') as
      | 'low'
      | 'medium'
      | 'high'
      | 'epic';
    await updateUserSettings(ctx, { intensity }, `Intensity set to ${formatIntensity(intensity)}`);
  });

  bot.callbackQuery(/^set_notifications_/, async (ctx) => {
    const notifications = ctx.callbackQuery.data.replace('set_notifications_', '') as
      | 'all'
      | 'important'
      | 'off';
    await updateUserSettings(ctx, { notifications }, 'Notification settings updated');
  });

  bot.callbackQuery(/^set_model_/, async (ctx) => {
    const model = ctx.callbackQuery.data.replace('set_model_', '') as
      | 'lyria-3-clip-preview'
      | 'lyria-3-pro-preview';
    await updateUserSettings(ctx, { model }, `Default model set to ${formatModel(model)}`);
  });

  // History filter handlers
  const handleHistoryFilter = async (ctx: any, status: string | null, title: string) => {
    await ctx.answerCallbackQuery();
    const user = ctx.user;
    if (!user) return ctx.reply('Error: User not found');

    const where: any = { userId: user.id };
    if (status) where.status = status;

    const tracks = await prisma.track.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (tracks.length === 0) {
      return ctx.editMessageText(`📜 ${title}\n\nNo tracks found.`, {
        reply_markup: historyMenuKeyboard(),
      });
    }

    let message = `📜 ${title}\n\n`;
    tracks.forEach((track: any, i: number) => {
      const statusEmoji = { queued: '⏳', processing: '🔄', done: '✅', failed: '❌' }[
        track.status
      ];
      message += `${i + 1}. ${statusEmoji} ${track.type}\n`;
      message += `   ${(track.prompt || '').slice(0, 40)}...\n\n`;
    });

    await ctx.editMessageText(message, {
      reply_markup: historyMenuKeyboard(),
    });
  };

  bot.callbackQuery('history_done', async (ctx) =>
    handleHistoryFilter(ctx, 'done', '✅ Completed Tracks')
  );
  bot.callbackQuery('history_processing', async (ctx) =>
    handleHistoryFilter(ctx, 'processing', '⏳ Processing Tracks')
  );
  bot.callbackQuery('history_failed', async (ctx) =>
    handleHistoryFilter(ctx, 'failed', '❌ Failed Tracks')
  );

  bot.callbackQuery(/^buy_pack_/, async (ctx) => {
    const user = ctx.user;
    if (!user) {
      return ctx.reply('Error: User not found');
    }

    const packageId = ctx.callbackQuery.data.replace('buy_', '');
    await ctx.answerCallbackQuery();
    await buildPaymentInvoice(ctx, user.id, packageId);
  });

  bot.callbackQuery(/^buy_pro/, async (ctx) => {
    const user = ctx.user;
    if (!user) {
      return ctx.reply('Error: User not found');
    }

    const packageId = ctx.callbackQuery.data.replace('buy_', '');
    await ctx.answerCallbackQuery();
    await buildPaymentInvoice(ctx, user.id, packageId);
  });

  bot.callbackQuery(/^buy_unlimited/, async (ctx) => {
    const user = ctx.user;
    if (!user) {
      return ctx.reply('Error: User not found');
    }

    const packageId = ctx.callbackQuery.data.replace('buy_', '');
    await ctx.answerCallbackQuery();
    await buildPaymentInvoice(ctx, user.id, packageId);
  });

  bot.on('pre_checkout_query', async (ctx) => {
    await ctx.answerPreCheckoutQuery(true);
  });

  bot.on('message:successful_payment', async (ctx) => {
    await handleSuccessfulPayment(ctx);
  });

  bot.callbackQuery('confirm_delete', confirmDeleteAccount);

  bot.callbackQuery('cancel_delete', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply('Account deletion cancelled.');
  });

  bot.callbackQuery('noop', async (ctx) => {
    await ctx.answerCallbackQuery();
  });

  // History pagination handlers
  bot.callbackQuery(/^history_page_/, handleHistoryPage);
  bot.callbackQuery('history_summary', handleHistorySummary);

  // Track action handlers
  bot.callbackQuery(/^share_/, async (ctx) => {
    await ctx.answerCallbackQuery('📤 Share feature coming soon!');
  });

  bot.callbackQuery(/^copy_prompt_/, async (ctx) => {
    const trackId = ctx.callbackQuery.data.replace('copy_prompt_', '');
    const user = ctx.user;
    if (!user) return ctx.answerCallbackQuery('❌ User not found');

    const track = await prisma.track.findFirst({
      where: { id: trackId, userId: user.id },
    });

    if (track) {
      await ctx.answerCallbackQuery();
      await ctx.reply(`📋 *Original Prompt:*\n\n` + track.prompt, { parse_mode: 'Markdown' });
    } else {
      await ctx.answerCallbackQuery('❌ Track not found');
    }
  });

  bot.callbackQuery(/^add_to_library_/, async (ctx) => {
    const trackId = ctx.callbackQuery.data.replace('add_to_library_', '');
    const user = ctx.user;
    if (!user) return ctx.answerCallbackQuery('❌ User not found');

    await prisma.track.updateMany({
      where: { id: trackId, userId: user.id },
      data: { isPublic: true },
    });

    await ctx.answerCallbackQuery('✅ Added to public library!');
  });

  bot.callbackQuery(/^extend_/, async (ctx) => {
    await ctx.answerCallbackQuery('🎼 Extend feature coming soon!');
  });

  bot.callbackQuery(/^regen_/, async (ctx) => {
    await ctx.answerCallbackQuery('🔄 Regenerate feature coming soon!');
  });

  bot.callbackQuery(/^refresh_track_/, async (ctx) => {
    const trackId = ctx.callbackQuery.data.replace('refresh_track_', '');
    const user = ctx.user;
    if (!user) return ctx.answerCallbackQuery('❌ User not found');

    const track = await prisma.track.findFirst({
      where: { id: trackId, userId: user.id },
    });

    if (track) {
      await ctx.answerCallbackQuery(
        `${track.status === 'done' ? '✅' : '🔄'} Status: ${track.status}`
      );
      // Refresh the history page
      await showHistoryPage(ctx, { page: 1, filter: 'all' });
    } else {
      await ctx.answerCallbackQuery('❌ Track not found');
    }
  });

  bot.callbackQuery(/^retry_/, async (ctx) => {
    await ctx.answerCallbackQuery('🔄 Retry feature coming soon!');
  });

  bot.callbackQuery(/^delete_track_/, async (ctx) => {
    const trackId = ctx.callbackQuery.data.replace('delete_track_', '');
    const user = ctx.user;
    if (!user) return ctx.answerCallbackQuery('❌ User not found');

    // Soft delete - mark as failed or add deleted flag
    // For now, just remove the gcsUrl so it doesn't show download button
    await prisma.track.updateMany({
      where: { id: trackId, userId: user.id },
      data: { gcsUrl: null },
    });

    await ctx.answerCallbackQuery('🗑️ Track removed from history');
    await showHistoryPage(ctx, { page: 1, filter: 'all' });
  });

  // Download track callback handler
  bot.callbackQuery(/^download_/, async (ctx) => {
    await ctx.answerCallbackQuery('⬇️ Preparing download...');

    const trackId = ctx.callbackQuery.data.replace('download_', '');
    const user = ctx.user;

    if (!user) {
      return ctx.reply('❌ Error: User not found');
    }

    try {
      // Verify track belongs to user and is done
      const track = await prisma.track.findFirst({
        where: { id: trackId, userId: user.id, status: 'done' },
      });

      if (!track || !track.gcsUrl) {
        return ctx.reply('❌ Track not found or not ready yet');
      }

      // Extract storage key from gcsUrl (e.g., "http://minio:9000/bucket/tracks/id.mp3" -> "tracks/id.mp3")
      const storageKey = track.gcsUrl.split('/').slice(-2).join('/');

      // Send the audio file
      const audioBuffer = await storageService.getFileBuffer(storageKey);

      await ctx.replyWithAudio(
        new InputFile(audioBuffer, `${track.type}_track_${track.id.slice(0, 8)}.mp3`),
        {
          caption: `🎵 ${track.type === 'instrumental' ? 'Instrumental' : 'Vocal'} track\n📝 ${track.prompt.slice(0, 100)}${track.prompt.length > 100 ? '...' : ''}`,
          title: `MusicAI - ${track.id.slice(0, 8)}`,
          performer: 'MusicAI Bot',
        }
      );
      console.log(`[Download] Sent audio for track ${trackId}`);
    } catch (err) {
      console.error(`[Download] Failed to send track ${trackId}:`, err);
      await ctx.reply('❌ Failed to download track. Please try again later.');
    }
  });

  bot.catch((err) => {
    console.error('Bot error:', err);
  });
}

declare module 'grammy' {
  export interface Context {
    user?: {
      id: string;
      telegramId: bigint;
      username: string | null;
      firstName: string | null;
      credits: number;
      subscriptionTier: string;
      subscriptionExpiresAt?: Date | null;
      defaultSettings?: unknown;
    };
  }
}
