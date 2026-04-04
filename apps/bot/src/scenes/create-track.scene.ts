import { createConversation } from '@grammyjs/conversations';
import { BotContext } from '../bot';
import { trackTypeKeyboard, languageKeyboard, intensityKeyboard, confirmKeyboard } from '../keyboards/track-options.keyboard';

interface CreateTrackSession {
  type?: 'full_song' | 'clip' | 'instrumental';
  prompt?: string;
  language?: string;
  intensity?: 'low' | 'medium' | 'high' | 'epic';
  bpm?: number;
  negativePrompt?: string;
}

export const createTrackScene = createConversation<BotContext, CreateTrackSession>(
  async (conversation, ctx) => {
    const session = conversation.session;

    // Step 1: Select track type
    await ctx.reply('🎵 *Select track type:*', {
      parse_mode: 'Markdown',
      reply_markup: trackTypeKeyboard(),
    });

    const typeCtx = await conversation.waitForCallbackQuery(
      ['type_full_song', 'type_clip', 'type_instrumental'],
    );
    session.type = typeCtx.callbackQuery.data.replace('type_', '') as CreateTrackSession['type'];
    await typeCtx.answerCallbackQuery();

    // Step 2: Enter prompt
    await ctx.reply(
      '📝 *Describe your track:*\n\n' +
        'Genre, mood, instruments, atmosphere...\n\n' +
        '*Example:* Lo-fi hip hop, soft piano, vinyl crackle, 75 BPM, study mood',
      { parse_mode: 'Markdown' },
    );

    const promptCtx = await conversation.waitFor('message:text');
    session.prompt = promptCtx.msg.text;

    if (session.prompt.length < 10 || session.prompt.length > 1000) {
      await ctx.reply('❌ Prompt must be between 10 and 1000 characters. Please try again.');
      return;
    }

    // Step 3: Select language (skip for instrumental)
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
    }

    // Step 4: Select intensity
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
    session.intensity = intensityCtx.callbackQuery.data.replace('intensity_', '') as CreateTrackSession['intensity'];
    await intensityCtx.answerCallbackQuery();

    // Step 5: Optional BPM
    await ctx.reply('🎯 *Enter BPM (60-200) or send "auto":*', { parse_mode: 'Markdown' });

    const bpmCtx = await conversation.waitFor('message:text');
    const bpmText = bpmCtx.msg.text.toLowerCase();
    if (bpmText === 'auto') {
      session.bpm = undefined;
    } else {
      const bpm = parseInt(bpmText, 10);
      if (isNaN(bpm) || bpm < 60 || bpm > 200) {
        await ctx.reply('❌ Invalid BPM. Using auto.');
        session.bpm = undefined;
      } else {
        session.bpm = bpm;
      }
    }

    // Step 6: Optional negative prompt
    await ctx.reply('🚫 *Enter negative prompt (what to avoid) or send "skip":*', {
      parse_mode: 'Markdown',
    });

    const negCtx = await conversation.waitFor('message:text');
    if (negCtx.msg.text.toLowerCase() !== 'skip') {
      session.negativePrompt = negCtx.msg.text.slice(0, 300);
    }

    // Step 7: Confirm
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
      },
    );

    const confirmCtx = await conversation.waitForCallbackQuery(['confirm_create', 'cancel_create']);
    await confirmCtx.answerCallbackQuery();

    if (confirmCtx.callbackQuery.data === 'cancel_create') {
      await ctx.reply('❌ Track creation cancelled.');
      return;
    }

    // Create the track
    await ctx.reply('🎵 Patience you must have, young padawan... Creating your track...');
  },
);
