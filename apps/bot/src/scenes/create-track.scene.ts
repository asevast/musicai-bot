import { createConversation, type Conversation } from '@grammyjs/conversations';
import type { BotContext } from '../bot';
import {
  trackTypeKeyboard,
  languageKeyboard,
  intensityKeyboard,
  confirmKeyboard,
} from '../keyboards/track-options.keyboard';
import { parseUserSettings } from '../utils/user-settings';

const API_URL = process.env.API_URL || 'http://localhost:3000';

interface CreateTrackData {
  type?: 'full_song' | 'clip' | 'instrumental';
  prompt?: string;
  language?: string;
  intensity?: 'low' | 'medium' | 'high' | 'epic';
  bpm?: number;
  negativePrompt?: string;
}

type CreateTrackConversation = Conversation<BotContext>;

export const createTrackScene = createConversation(async function createTrack(
  conversation: CreateTrackConversation,
  ctx: BotContext
) {
  const user = ctx.user;

  if (!user) {
    await ctx.reply('❌ Error: User not found');
    return;
  }

  const session = (ctx as any).session ?? {};
  const settings = parseUserSettings(user.defaultSettings);
  const isPaidUser = user.subscriptionTier !== 'free';

  session.type = undefined;
  session.prompt = undefined;
  session.language = settings.language;
  session.intensity = settings.intensity;
  session.bpm = undefined;
  session.negativePrompt = undefined;

  await ctx.reply('🎵 *Select track type:*', {
    parse_mode: 'Markdown',
    reply_markup: trackTypeKeyboard(isPaidUser),
  });

  const availableTypes = isPaidUser
    ? ['type_full_song', 'type_clip', 'type_instrumental']
    : ['type_clip'];
  const typeCtx = await conversation.waitForCallbackQuery(availableTypes);
  session.type = typeCtx.callbackQuery.data.replace('type_', '') as CreateTrackData['type'];
  await typeCtx.answerCallbackQuery();

  await ctx.reply(
    '📝 *Describe your track:*\n\n' +
      'Genre, mood, instruments, atmosphere...\n\n' +
      '*Example:* Lo-fi hip hop, soft piano, vinyl crackle, 75 BPM, study mood',
    { parse_mode: 'Markdown' }
  );

  const promptCtx = await conversation.waitFor('message:text');
  session.prompt = promptCtx.msg.text;

  if (session.prompt.length < 10 || session.prompt.length > 1000) {
    await ctx.reply('❌ Prompt must be between 10 and 1000 characters. Please try again.');
    return;
  }

  if (session.type !== 'instrumental') {
    await ctx.reply('🌍 *Select vocal language:*', {
      parse_mode: 'Markdown',
      reply_markup: languageKeyboard(),
    });

    const langCtx = await conversation.waitForCallbackQuery([
      'lang_en',
      'lang_de',
      'lang_es',
      'lang_fr',
      'lang_ja',
      'lang_ko',
      'lang_hi',
      'lang_pt',
    ]);
    session.language = langCtx.callbackQuery.data.replace('lang_', '');
    await langCtx.answerCallbackQuery();
  } else {
    session.language = undefined;
  }

  if (settings.intensity) {
    await ctx.reply(`🎚️ *Intensity:* using your default setting: *${settings.intensity}*`, {
      parse_mode: 'Markdown',
    });
  } else {
    await ctx.reply('🎚️ *Select intensity:*', {
      parse_mode: 'Markdown',
      reply_markup: intensityKeyboard(),
    });

    const intensityCtx = await conversation.waitForCallbackQuery([
      'intensity_low',
      'intensity_medium',
      'intensity_high',
      'intensity_epic',
    ]);
    session.intensity = intensityCtx.callbackQuery.data.replace(
      'intensity_',
      ''
    ) as CreateTrackData['intensity'];
    await intensityCtx.answerCallbackQuery();
  }

  await ctx.reply('🎯 *Enter BPM (60-200) or send "auto":*', { parse_mode: 'Markdown' });

  const bpmCtx = await conversation.waitFor('message:text');
  const bpmText = bpmCtx.msg.text.toLowerCase();
  if (bpmText === 'auto') {
    session.bpm = undefined;
  } else {
    const bpm = parseInt(bpmText, 10);
    if (isNaN(bpm) || bpm < 60 || bpm > 200) {
      await ctx.reply('❝ Invalid BPM. Using auto.');
      session.bpm = undefined;
    } else {
      session.bpm = bpm;
    }
  }

  await ctx.reply('🚫 *Enter negative prompt (what to avoid) or send "skip":*', {
    parse_mode: 'Markdown',
  });

  const negCtx = await conversation.waitFor('message:text');
  if (negCtx.msg.text.toLowerCase() !== 'skip') {
    session.negativePrompt = negCtx.msg.text.slice(0, 300);
  }

  const cost = session.type === 'clip' ? 1 : session.type === 'instrumental' ? 3 : 5;

  await ctx.reply(
    `📋 *Track Summary:*\n\n` +
      `• Type: ${session.type}\n` +
      `• Prompt: ${session.prompt}\n` +
      `• Language: ${session.language ?? 'N/A'}\n` +
      `• Intensity: ${session.intensity}\n` +
      `• BPM: ${session.bpm ?? 'Auto'}\n` +
      `• Cost: ${cost} credits\n\n` +
      `*Proceed?*`,
    {
      parse_mode: 'Markdown',
      reply_markup: confirmKeyboard(),
    }
  );

  const confirmCtx = await conversation.waitForCallbackQuery(['confirm_create', 'cancel_create']);
  await confirmCtx.answerCallbackQuery();

  if (confirmCtx.callbackQuery.data === 'cancel_create') {
    await ctx.reply('❌ Track creation cancelled.');
    return;
  }

  const statusMsg = await ctx.reply(
    '🎵 Patience you must have, young padawan... Creating your track...'
  );

  try {
    const model = session.type === 'clip' ? 'lyria-3-clip-preview' : 'lyria-3-pro-preview';

    console.log('[CREATE-TRACK] Fetching:', API_URL, '/tracks');
    console.log('[CREATE-TRACK] Payload:', {
      model,
      type: session.type,
      prompt: session.prompt,
      telegramId: user.telegramId.toString(),
    });

    const response = await fetch(`${API_URL}/tracks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Id': user.telegramId.toString(),
      },
      body: JSON.stringify({
        model,
        type: session.type,
        prompt: session.prompt,
        negativePrompt: session.negativePrompt,
        bpm: session.bpm,
        intensity: session.intensity,
        language: session.language,
        telegramId: user.telegramId.toString(),
        chatId: ctx.chat?.id,
        messageId: statusMsg.message_id,
      }),
    });

    console.log('[CREATE-TRACK] Response status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const track = (await response.json()) as { id: string };

    await ctx.reply(
      `✅ *Track queued!*\n\n` +
        `Track ID: \`${track.id.slice(0, 8)}...\`\n` +
        `Estimated time: ~45 seconds\n\n` +
        `You will be notified when your track is ready.`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    await ctx.reply(
      `❌ Failed to create track: ${err instanceof Error ? err.message : String(err)}`
    );
  }
});
