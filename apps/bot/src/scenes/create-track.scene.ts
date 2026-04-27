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

const API_URL = process.env.API_URL || 'http://localhost:3000';

interface CreateTrackData {
  type?: 'full_song' | 'clip' | 'instrumental';
  prompt?: string;
  negativePrompt?: string;
  language?: string;
  intensity?: 'low' | 'medium' | 'high' | 'epic';
  bpm?: number;
  lyrics?: string;
  imageBase64?: string;
  imageMimeType?: string;
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

  await ctx.reply('🎵 *Select track type:*', {
    parse_mode: 'Markdown',
    reply_markup: trackTypeKeyboard(isPaidUser),
  });

  const availableTypes = isPaidUser
    ? ['type_full_song', 'type_clip', 'type_instrumental']
    : ['type_clip'];
  const typeCtx = await conversation.waitForCallbackQuery(availableTypes);
  session.type = typeCtx.callbackQuery.data.replace('type_', '') as CreateTrackData['type'];
  await typeCtx.answerCallbackQuery().catch(() => {});

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

  // Step 3.5: Optional image upload
  session.imageBase64 = undefined;
  session.imageMimeType = undefined;

  await ctx.reply(
    '📸 *Optional: Upload an image*\n\n' +
      'Send a photo to inspire the music, or tap "Skip" to continue without an image.',
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('⏭️ Skip', 'image_skip').row(),
    }
  );

  // Wait for either an image or skip button
  const imageCtx = await conversation.wait();

  // Check if it's a skip callback
  if (imageCtx.callbackQuery?.data === 'image_skip') {
    await imageCtx.answerCallbackQuery('Skipped image upload').catch(() => {});
  } else if (
    imageCtx.message?.photo ||
    imageCtx.message?.document?.mime_type?.startsWith('image/')
  ) {
    // Image uploaded
    try {
      let fileId: string;

      let mimeType = 'image/jpeg'; // Default for photos
      if (imageCtx.message.photo && imageCtx.message.photo.length > 0) {
        // Get a medium-sized photo (not the largest to avoid size limits)
        // Telegram provides multiple sizes: index 0 = smallest, last = largest
        const photoIndex = Math.min(1, imageCtx.message.photo.length - 1);
        fileId = imageCtx.message.photo[photoIndex].file_id;
      } else if (imageCtx.message.document) {
        fileId = imageCtx.message.document.file_id;
        // Use actual MIME type from document, or detect from file extension
        const docMimeType = imageCtx.message.document.mime_type;
        const fileName = imageCtx.message.document.file_name || '';
        if (docMimeType && docMimeType.startsWith('image/')) {
          mimeType = docMimeType;
        } else {
          // Try to detect from file extension
          const ext = fileName.split('.').pop()?.toLowerCase();
          if (ext === 'png') mimeType = 'image/png';
          else if (ext === 'webp') mimeType = 'image/webp';
          else if (ext === 'gif') mimeType = 'image/gif';
          else if (ext === 'bmp') mimeType = 'image/bmp';
          else mimeType = 'image/jpeg'; // Default
        }
      } else {
        throw new Error('No image found in message');
      }

      // Get file path from Telegram
      const file = await ctx.api.getFile(fileId);
      if (!file.file_path) {
        throw new Error('Could not get file path from Telegram');
      }

      // Download the file using native https
      const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

      const imageBuffer = await new Promise<Buffer>((resolve, reject) => {
        const url = new URL(fileUrl);

        const options = {
          hostname: url.hostname,
          path: url.pathname,
          method: 'GET',
          timeout: 30000, // 30 second timeout
        };

        const req = https.request(options, (res: any) => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }

          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });

          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            resolve(buffer);
          });

          res.on('error', (err: Error) => {
            reject(err);
          });
        });

        req.on('error', (err: Error) => {
          console.error('[CREATE-TRACK] Request error:', err.message);
          reject(err);
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });

        req.end();
      });

      // Convert to base64 with size limit (max ~500KB after base64 = ~375KB raw)
      const MAX_IMAGE_SIZE = 375 * 1024; // 375KB max

      if (imageBuffer.length > MAX_IMAGE_SIZE) {
        await ctx.reply('⚠️ Image is too large (max 375KB). Continuing without image...');
        session.imageBase64 = undefined;
        session.imageMimeType = undefined;
      } else {
        session.imageBase64 = imageBuffer.toString('base64');
        // Use the detected MIME type from the upload
        session.imageMimeType = mimeType || 'image/jpeg';
        await ctx.reply('✅ Image uploaded successfully!');
      }
    } catch (error) {
      console.error('[CREATE-TRACK] Image upload error:', error);
      await ctx.reply('⚠️ Failed to process image. Continuing without image...');
      session.imageBase64 = undefined;
      session.imageMimeType = undefined;
    }
  } else {
    await ctx.reply('⏭️ Continuing without image...');
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

  // Step 4: Lyrics (for vocal tracks)
  if (session.type !== 'instrumental') {
    await ctx.reply(
      '✍️ *Lyrics*\n\n' +
        'Would you like to provide your own lyrics text, have AI generate them automatically, or skip?',
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
    } else if (lyricsChoice === 'lyrics_auto') {
      // AI will generate lyrics automatically - no user input needed
      session.lyrics = undefined; // Will be handled by API
    } else {
      // Skip lyrics
      session.lyrics = undefined;
    }
  }

  // Step 5: Additional Settings
  await ctx.reply(
    '⚙️ *Additional Settings*\n\n' +
      'You can customize BPM and intensity, or skip to use defaults.',
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
      'settings_negative',
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
      ) as CreateTrackData['intensity'];
      await intensityCtx.answerCallbackQuery().catch(() => {});
      await ctx.reply('⚙️ *Additional Settings*\n\nAnything else?', {
        parse_mode: 'Markdown',
        reply_markup: additionalSettingsKeyboard(),
      });
    } else if (setting === 'settings_negative') {
      await ctx.reply(
        '🚫 *Negative Prompt*\n\n' +
        'What should the AI avoid in the generation?\n' +
        'For example: "drums, loud noise, screaming, distortion"\n\n' +
        'Send your negative prompt or type /skip:',
        { parse_mode: 'Markdown' }
      );
      const negativeCtx = await conversation.waitFor('message:text');
      const negativeText = negativeCtx.msg.text.trim();
      if (negativeText !== '/skip' && negativeText.length > 0) {
        session.negativePrompt = negativeText.slice(0, 300);
      }
      await ctx.reply('⚙️ *Additional Settings*\n\nAnything else?', {
        parse_mode: 'Markdown',
        reply_markup: additionalSettingsKeyboard(),
      });
    } else if (setting === 'settings_skip') {
      settingsDone = true;
    }
  }

  // Ensure intensity has a value
  if (!session.intensity && settings.intensity) {
    session.intensity = settings.intensity as CreateTrackData['intensity'];
  } else if (!session.intensity) {
    session.intensity = 'medium';
  }

  const cost = session.type === 'clip' ? 1 : session.type === 'instrumental' ? 3 : 5;

  // Escape special Markdown characters in user content
  const escapeMd = (text: string) => text.replace(/([_*[\]()~`>#+-=|{}.!])/g, '\\$1');

  await ctx.reply(
    `📋 Track Summary:\n\n` +
      `• Type: ${session.type}\n` +
      `• Prompt: ${escapeMd(session.prompt.slice(0, 100))}${session.prompt.length > 100 ? '...' : ''}\n` +
      `• Language: ${session.language ?? 'N/A'}\n` +
      `• Intensity: ${session.intensity}\n` +
      `• BPM: ${session.bpm ?? 'Auto'}\n` +
      `• Lyrics: ${session.lyrics ? 'Custom' : session.type !== 'instrumental' ? 'Auto' : 'N/A'}\n` +
      `• Image: ${session.imageBase64 ? '✅ Yes' : '⏭️ Skipped'}\n` +
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
  } catch (err) {
    await ctx.reply(
      `❌ Failed to create track: ${err instanceof Error ? err.message : String(err)}`
    );
  }
});
