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
  handleViewTrack,
  handleHistoryFilter,
} from './commands/history.command';
import { helpCommand } from './commands/help.command';
import { profileCommand } from './commands/profile.command';
import { buyCommand } from './commands/buy.command';
import { settingsCommand } from './commands/settings.command';
import { deleteAccountCommand, confirmDeleteAccount } from './commands/delete-account.command';
import { libraryCommand } from './commands/library.command';
import { menuCommand } from './commands/menu.command';
import { fleshCommand } from './commands/flesh.command';
import { imageToMusicCommand, imageToMusicScene } from './commands/image-to-music.command';
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
  bot.use(imageToMusicScene);

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
  bot.command('image', imageToMusicCommand);

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

  bot.callbackQuery('image_to_music', async (ctx) => {
    await ctx.answerCallbackQuery();
    await (ctx as any).conversation?.enter('imageToMusic');
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

  bot.callbackQuery('cancel_image_music', async (ctx) => {
    await ctx.answerCallbackQuery('Cancelled');
    await ctx.reply('❌ Image to Music cancelled.');
  });

  // History pagination handlers
  bot.callbackQuery(/^history_page_/, handleHistoryPage);
  bot.callbackQuery('history_summary', handleHistorySummary);
  bot.callbackQuery(/^view_track_/, handleViewTrack);
  bot.callbackQuery(/^history_filter_/, handleHistoryFilter);

  // Track action handlers
  bot.callbackQuery(/^share_/, async (ctx) => {
    const trackId = ctx.callbackQuery.data.replace('share_', '');
    const user = ctx.user;
    if (!user) return ctx.answerCallbackQuery('❌ User not found');

    const track = await prisma.track.findFirst({
      where: { id: trackId, userId: user.id, status: 'done' },
      include: { user: { select: { username: true, firstName: true } } },
    });

    if (!track || !track.gcsUrl) {
      return ctx.answerCallbackQuery('❌ Track not found or not ready');
    }

    // Get audio file from storage
    const storageKey = track.gcsUrl.split('/').slice(-2).join('/');
    const audioBuffer = await storageService.getFileBuffer(storageKey);

    // Build share text (no Markdown to avoid parsing issues)
    const authorName = track.user.username || track.user.firstName || 'Anonymous';
    const shareText =
      `🎵 Track by ${authorName}\n\n` +
      `${track.prompt.slice(0, 100)}${track.prompt.length > 100 ? '...' : ''}\n\n` +
      `Created with @fleshmus_bot`;

    await ctx.answerCallbackQuery();
    await ctx.reply(shareText);

    // Send the audio file for forwarding

    // Also send the audio file
    await ctx.replyWithAudio(new InputFile(audioBuffer, `track_${trackId}.mp3`), {
      title: track.prompt.slice(0, 50),
      performer: 'MusicAI',
    });
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
    const trackId = ctx.callbackQuery.data.replace('extend_', '');
    const user = ctx.user;
    if (!user) return ctx.answerCallbackQuery('❌ User not found');

    const track = await prisma.track.findFirst({
      where: { id: trackId, userId: user.id, status: 'done', type: 'clip' },
    });

    if (!track) {
      return ctx.answerCallbackQuery('❌ Clip not found or already a full song');
    }

    // Parse parameters from the clip
    // Parse parameters from the clip

    // Create confirmation message with cost
    const confirmKeyboard = new InlineKeyboard()
      .text('✅ Extend (3 credits)', `confirm_extend_${trackId}`)
      .row()
      .text('❌ Cancel', 'cancel_extend');

    await ctx.answerCallbackQuery();
    await ctx.reply(
      '🎼 *Extend to Full Song*\n\n' +
        `This will create a full song version of your clip:\n` +
        `• Original: 30 second clip\n` +
        `• Extended: ~3 minute full song\n` +
        `• Same prompt and style: ${track.prompt.slice(0, 50)}...\n\n` +
        `⚠️ *Note:* The extended song will be inspired by your clip but may have different lyrics and melody variations to fill the longer duration.\n\n` +
        `Cost: 3 credits`,
      { parse_mode: 'Markdown', reply_markup: confirmKeyboard }
    );
  });

  bot.callbackQuery(/^confirm_extend_/, async (ctx) => {
    const trackId = ctx.callbackQuery.data.replace('confirm_extend_', '');
    const user = ctx.user;
    if (!user) return ctx.answerCallbackQuery('❌ User not found');

    const sourceTrack = await prisma.track.findFirst({
      where: { id: trackId, userId: user.id, status: 'done', type: 'clip' },
    });

    if (!sourceTrack) {
      return ctx.answerCallbackQuery('❌ Clip not found');
    }

    const params = sourceTrack.parameters as Record<string, unknown>;

    // Create new full song track
    const API_URL = process.env.API_URL || 'http://api:3000';
    const response = await fetch(`${API_URL}/tracks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Id': user.telegramId.toString(),
      },
      body: JSON.stringify({
        model: 'lyria-3-pro-preview', // Full song requires pro model
        type: 'full_song',
        prompt: sourceTrack.prompt,
        negativePrompt: sourceTrack.negativePrompt,
        lyrics: sourceTrack.lyrics,
        bpm: params.bpm,
        intensity: params.intensity,
        language: params.language,
        durationSeconds: 180, // ~3 minutes
        telegramId: user.telegramId.toString(),
        chatId: ctx.chat?.id,
        sourceTrackId: trackId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return ctx.reply('❌ Failed to extend clip: ' + error);
    }

    await ctx.answerCallbackQuery('✅ Full song creation started!');
    await ctx.reply('🎼 Your clip is being extended to a full song!');
  });

  bot.callbackQuery('cancel_extend', async (ctx) => {
    await ctx.answerCallbackQuery('Cancelled');
    await ctx.deleteMessage();
  });

  bot.callbackQuery(/^regen_/, async (ctx) => {
    const trackId = ctx.callbackQuery.data.replace('regen_', '');
    const user = ctx.user;
    if (!user) return ctx.answerCallbackQuery('❌ User not found');

    const track = await prisma.track.findFirst({
      where: { id: trackId, userId: user.id, status: 'done' },
    });

    if (!track) {
      return ctx.answerCallbackQuery('❌ Track not found');
    }

    // Parse parameters from the original track
    const params = track.parameters as Record<string, unknown>;

    // Create confirmation message with cost
    const cost = track.model === 'lyria-3-clip-preview' ? 1 : 3;
    const discount = Math.max(1, Math.floor(cost * 0.5));

    const confirmKeyboard = new InlineKeyboard()
      .text('✅ Create (50% off: ' + discount + ' credits)', `confirm_regen_${trackId}`)
      .row()
      .text('❌ Cancel', 'cancel_regen');

    await ctx.answerCallbackQuery();
    await ctx.reply(
      '🔄 *Regenerate Track*\n\n' +
        `This will create a new track with the same settings:\n` +
        `• Type: ${track.type}\n` +
        `• Model: ${track.model}\n` +
        `• Prompt: ${track.prompt.slice(0, 50)}...\n\n` +
        `You can edit the lyrics in the next step.\n` +
        `Cost: ${discount} credits (50% discount)`,
      { parse_mode: 'Markdown', reply_markup: confirmKeyboard }
    );
  });

  bot.callbackQuery(/^confirm_regen_/, async (ctx) => {
    const trackId = ctx.callbackQuery.data.replace('confirm_regen_', '');
    const user = ctx.user;
    if (!user) return ctx.answerCallbackQuery('❌ User not found');

    const sourceTrack = await prisma.track.findFirst({
      where: { id: trackId, userId: user.id, status: 'done' },
    });

    if (!sourceTrack) {
      return ctx.answerCallbackQuery('❌ Track not found');
    }

    const params = sourceTrack.parameters as Record<string, unknown>;

    // Create new track with same parameters
    const API_URL = process.env.API_URL || 'http://api:3000';
    const response = await fetch(`${API_URL}/tracks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Id': user.telegramId.toString(),
      },
      body: JSON.stringify({
        model: sourceTrack.model,
        type: sourceTrack.type,
        prompt: sourceTrack.prompt,
        negativePrompt: sourceTrack.negativePrompt,
        lyrics: sourceTrack.lyrics, // Can be edited
        bpm: params.bpm,
        intensity: params.intensity,
        language: params.language,
        durationSeconds: params.durationSeconds as number | undefined,
        telegramId: user.telegramId.toString(),
        chatId: ctx.chat?.id,
        isRegeneration: true,
        sourceTrackId: trackId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return ctx.reply('❌ Failed to create track: ' + error);
    }

    await ctx.answerCallbackQuery('✅ New track created!');
    await ctx.reply('🎵 Your track is being regenerated with a 50% discount!');
  });

  bot.callbackQuery('cancel_regen', async (ctx) => {
    await ctx.answerCallbackQuery('Cancelled');
    await ctx.deleteMessage();
  });

  // Forward track handler
  bot.callbackQuery(/^forward_/, async (ctx) => {
    const trackId = ctx.callbackQuery.data.replace('forward_', '');
    await ctx.answerCallbackQuery('📤 Forward this track to any chat!');
    // User needs to manually forward the audio message
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
    const trackId = ctx.callbackQuery.data.replace('retry_', '');
    const user = ctx.user;
    if (!user) return ctx.answerCallbackQuery('❌ User not found');

    const track = await prisma.track.findFirst({
      where: { id: trackId, userId: user.id },
    });

    if (!track) {
      return ctx.answerCallbackQuery('❌ Track not found');
    }

    if (track.status !== 'failed') {
      return ctx.answerCallbackQuery('⚠️ Track is not failed, cannot retry');
    }

    // Reset track to queued status
    await prisma.track.update({
      where: { id: trackId },
      data: {
        status: 'queued',
        gcsUrl: null,
        durationSec: null,
        revisedPrompt: null,
      },
    });

    // Create new synth job
    const API_URL = process.env.API_URL || 'http://api:3000';
    const response = await fetch(`${API_URL}/tracks/${trackId}/retry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Id': user.telegramId.toString(),
      },
      body: JSON.stringify({
        chatId: ctx.chat?.id,
        messageId: (await ctx.reply('🔄 Retrying track generation...')).message_id,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      await ctx.answerCallbackQuery('❌ Failed to retry');
      return ctx.reply('❌ Retry failed: ' + error);
    }

    await ctx.answerCallbackQuery('✅ Track queued for retry!');
    await ctx.reply('🎵 Your track is being regenerated. You will be notified when it is ready.');
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

      // Extract storage key from gcsUrl
      // URL format: http://minio:9000/bucket-name/tracks/trackId.mp3
      // We need to extract: tracks/trackId.mp3 (everything after bucket name)
      const gcsUrlObj = new URL(track.gcsUrl);
      const pathParts = gcsUrlObj.pathname.split('/').filter(Boolean);
      // pathParts = ['bucket-name', 'tracks', 'trackId.mp3']
      // Remove bucket name (first part) to get storage key
      if (pathParts.length < 2) {
        throw new Error(`Invalid gcsUrl format: ${track.gcsUrl}`);
      }
      const storageKey = pathParts.slice(1).join('/');

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
