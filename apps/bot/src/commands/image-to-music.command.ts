import { createConversation, type Conversation } from '@grammyjs/conversations';
import { InlineKeyboard } from 'grammy';
import https from 'https';
import type { BotContext } from '../bot';
import {
  trackTypeKeyboard,
  languageKeyboard,
  intensityKeyboard,
  confirmKeyboard,
  lyricsKeyboard,
  additionalSettingsKeyboard,
} from '../keyboards/track-options.keyboard';
import { parseUserSettings } from '../utils/user-settings';

const API_URL = process.env.API_URL || 'http://api:3000';
const MAX_IMAGE_SIZE = 375 * 1024;

interface ImageToMusicData {
  type?: 'full_song' | 'clip' | 'instrumental';
  prompt?: string;
  language?: string;
  intensity?: 'low' | 'medium' | 'high' | 'epic';
  bpm?: number;
  lyrics?: string;
  imageBase64?: string;
  imageMimeType?: string;
}

type ImageToMusicConversation = Conversation<BotContext>;

async function downloadImage(
  ctx: BotContext,
  fileId: string
): Promise<{ base64: string; mimeType: string } | null> {
  const file = await ctx.api.getFile(fileId);
  if (!file.file_path) throw new Error('Could not get file path from Telegram');

  const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

  const imageBuffer = await new Promise<Buffer>((resolve, reject) => {
    const url = new URL(fileUrl);
    const req = https.request(
      { hostname: url.hostname, path: url.pathname, method: 'GET', timeout: 30000 },
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });

  if (imageBuffer.length > MAX_IMAGE_SIZE) return null;

  return { base64: imageBuffer.toString('base64'), mimeType: 'image/jpeg' };
}

export const imageToMusicScene = createConversation(async function imageToMusic(
  conversation: ImageToMusicConversation,
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
  session.lyrics = undefined;
  session.imageBase64 = undefined;
  session.imageMimeType = undefined;

  await ctx.reply(
    '📸 *Image to Music*\n\n' +
      "Send me a photo and I'll generate music inspired by it!\n\n" +
      'The AI will analyze the image and combine it with your style preferences.',
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('❌ Cancel', 'cancel_image_music'),
    }
  );

  const imageCtx = await conversation.wait();

  if (imageCtx.callbackQuery?.data === 'cancel_image_music') {
    await imageCtx.answerCallbackQuery('Cancelled');
    await imageCtx.reply('❌ Image to Music cancelled.');
    return;
  }

  if (!imageCtx.message?.photo && !imageCtx.message?.document?.mime_type?.startsWith('image/')) {
    await imageCtx.reply("❌ That wasn't an image. Please use /image to try again.");
    return;
  }

  const processingMsg = await imageCtx.reply('🔄 Processing your image...');

  try {
    let fileId: string;
    let mimeType = 'image/jpeg';

    if (imageCtx.message.photo && imageCtx.message.photo.length > 0) {
      const photoIndex = Math.min(1, imageCtx.message.photo.length - 1);
      fileId = imageCtx.message.photo[photoIndex].file_id;
    } else if (imageCtx.message.document) {
      fileId = imageCtx.message.document.file_id;
      const docMimeType = imageCtx.message.document.mime_type;
      if (docMimeType && docMimeType.startsWith('image/')) {
        mimeType = docMimeType;
      } else {
        const ext = (imageCtx.message.document.file_name || '').split('.').pop()?.toLowerCase();
        if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'webp') mimeType = 'image/webp';
      }
    } else {
      throw new Error('No image found');
    }

    const result = await downloadImage(imageCtx, fileId);

    if (!result) {
      await imageCtx.api.editMessageText(
        processingMsg.chat.id,
        processingMsg.message_id,
        '⚠️ Image is too large (max 375KB). Please send a smaller image or use /image to try again.'
      );
      return;
    }

    session.imageBase64 = result.base64;
    session.imageMimeType = mimeType;

    await imageCtx.api.editMessageText(
      processingMsg.chat.id,
      processingMsg.message_id,
      "✅ Image received! Now let's set up your track."
    );
  } catch (error) {
    console.error('[IMAGE-TO-MUSIC] Image processing error:', error);
    await imageCtx.api.editMessageText(
      processingMsg.chat.id,
      processingMsg.message_id,
      '❌ Failed to process image. Please try again with /image.'
    );
    return;
  }

  await ctx.reply('🎵 *Select track type:*', {
    parse_mode: 'Markdown',
    reply_markup: trackTypeKeyboard(isPaidUser),
  });

  const availableTypes = isPaidUser
    ? ['type_full_song', 'type_clip', 'type_instrumental']
    : ['type_clip'];
  const typeCtx = await conversation.waitForCallbackQuery(availableTypes);
  session.type = typeCtx.callbackQuery.data.replace('type_', '') as ImageToMusicData['type'];
  await typeCtx.answerCallbackQuery().catch(() => {});

  await ctx.reply(
    '📝 *Describe the music style you want:*\n\n' +
      'Genre, mood, instruments, atmosphere inspired by the image...\n\n' +
      '*Example:* Cinematic orchestral, epic strings, dark ambient, 80 BPM, dramatic mood',
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
    await langCtx.answerCallbackQuery().catch(() => {});
  } else {
    session.language = undefined;
  }

  if (session.type !== 'instrumental') {
    await ctx.reply(
      '✍️ *Lyrics*\n\n' +
        'Would you like to provide your own lyrics, have AI generate them, or skip?',
      {
        parse_mode: 'Markdown',
        reply_markup: lyricsKeyboard(),
      }
    );

    const lyricsCtx = await conversation.waitForCallbackQuery([
      'lyrics_custom',
      'lyrics_auto',
      'lyrics_skip',
    ]);
    const lyricsChoice = lyricsCtx.callbackQuery.data;
    await lyricsCtx.answerCallbackQuery().catch(() => {});

    if (lyricsChoice === 'lyrics_custom') {
      await ctx.reply(
        '📝 *Enter your lyrics:*\n\n' +
          'Write your lyrics below. Use line breaks between verses and chorus.',
        { parse_mode: 'Markdown' }
      );
      const lyricsMsg = await conversation.waitFor('message:text');
      session.lyrics = lyricsMsg.msg.text.slice(0, 2000);
    } else {
      session.lyrics = undefined;
    }
  }

  await ctx.reply(
    '⚙️ *Additional Settings*\n\n' + 'Customize BPM and intensity, or skip to use defaults.',
    {
      parse_mode: 'Markdown',
      reply_markup: additionalSettingsKeyboard(),
    }
  );

  let settingsDone = false;
  while (!settingsDone) {
    const settingsCtx = await conversation.waitForCallbackQuery([
      'settings_bpm',
      'settings_intensity',
      'settings_skip',
    ]);
    const setting = settingsCtx.callbackQuery.data;
    await settingsCtx.answerCallbackQuery().catch(() => {});

    if (setting === 'settings_bpm') {
      await ctx.reply('🎯 *Enter BPM (60-200) or send "auto":*', { parse_mode: 'Markdown' });
      const bpmCtx = await conversation.waitFor('message:text');
      const bpmText = bpmCtx.msg.text.toLowerCase();
      if (bpmText === 'auto') {
        session.bpm = undefined;
      } else {
        const bpm = parseInt(bpmText, 10);
        if (isNaN(bpm) || bpm < 60 || bpm > 200) {
          await ctx.reply('⚠️ Invalid BPM. Using auto.');
          session.bpm = undefined;
        } else {
          session.bpm = bpm;
        }
      }
      await ctx.reply('⚙️ *Additional Settings*\n\nAnything else?', {
        parse_mode: 'Markdown',
        reply_markup: additionalSettingsKeyboard(),
      });
    } else if (setting === 'settings_intensity') {
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
      ) as ImageToMusicData['intensity'];
      await intensityCtx.answerCallbackQuery().catch(() => {});
      await ctx.reply('⚙️ *Additional Settings*\n\nAnything else?', {
        parse_mode: 'Markdown',
        reply_markup: additionalSettingsKeyboard(),
      });
    } else if (setting === 'settings_skip') {
      settingsDone = true;
    }
  }

  if (!session.intensity && settings.intensity) {
    session.intensity = settings.intensity as ImageToMusicData['intensity'];
  } else if (!session.intensity) {
    session.intensity = 'medium';
  }

  const cost = session.type === 'clip' ? 1 : session.type === 'instrumental' ? 3 : 5;

  const escapeMd = (text: string) => text.replace(/([_*[\]()~`>#+-=|{}.!])/g, '\\$1');

  await ctx.reply(
    `📋 Track Summary:\n\n` +
      `• Type: ${session.type}\n` +
      `• Prompt: ${escapeMd(session.prompt.slice(0, 100))}${session.prompt.length > 100 ? '...' : ''}\n` +
      `• Language: ${session.language ?? 'N/A'}\n` +
      `• Intensity: ${session.intensity}\n` +
      `• BPM: ${session.bpm ?? 'Auto'}\n` +
      `• Lyrics: ${session.lyrics ? 'Custom' : session.type !== 'instrumental' ? 'Auto' : 'N/A'}\n` +
      `• Image: ✅ Yes\n` +
      `• Cost: ${cost} credits\n\n` +
      `Proceed?`,
    {
      reply_markup: confirmKeyboard(),
    }
  );

  const confirmCtx = await conversation.waitForCallbackQuery(['confirm_create', 'cancel_create']);
  await confirmCtx.answerCallbackQuery().catch(() => {});

  if (confirmCtx.callbackQuery.data === 'cancel_create') {
    await ctx.reply('❌ Track creation cancelled.');
    return;
  }

  const statusMsg = await ctx.reply(
    '🎵 Patience you must have, young padawan... Creating your track...'
  );

  try {
    const model = session.type === 'clip' ? 'lyria-3-clip-preview' : 'lyria-3-pro-preview';

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
        lyrics: session.lyrics,
        promptRewriter: session.lyrics ? false : undefined,
        bpm: session.bpm,
        intensity: session.intensity,
        language: session.language,
        imageBase64: session.imageBase64,
        imageMimeType: session.imageMimeType,
        telegramId: user.telegramId.toString(),
        chatId: ctx.chat?.id,
        messageId: statusMsg.message_id,
      }),
    });

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
  } catch (error) {
    console.error('[IMAGE-TO-MUSIC] Error:', error);
    await ctx.reply(
      `❌ Failed to create track: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

export const imageToMusicCommand = async (ctx: BotContext & { conversation?: any }) => {
  await ctx.conversation!.enter('imageToMusic');
};
