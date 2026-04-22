import { Context, InlineKeyboard } from 'grammy';
import { prisma } from '@musicai/database';
import { GeminiClient } from '@musicai/vertex-ai';

// Initialize Gemini client from environment
const geminiClient = new GeminiClient(
  process.env.LYRIA_API_KEY || '',
  process.env.LYRIA_BASE_URL || 'https://routerai.ru/api/v1',
);

export const lyricsCommand = async (ctx: Context) => {
  const user = ctx.user;
  if (!user) {
    return ctx.reply('❌ User not found');
  }

  // Check if user has enough credits
  if (user.credits < 1) {
    return ctx.reply(
      '❌ Not enough credits!\n\n' +
        'Generating lyrics costs 1 credit.\n' +
        'Use /buy to purchase more credits.',
    );
  }

  // Show usage instructions
  const keyboard = new InlineKeyboard()
    .text('🇺🇸 English', 'lyrics_lang_en')
    .text('🇩🇪 German', 'lyrics_lang_de')
    .row()
    .text('🇪🇸 Spanish', 'lyrics_lang_es')
    .text('🇫🇷 French', 'lyrics_lang_fr')
    .row()
    .text('🇯🇵 Japanese', 'lyrics_lang_ja')
    .text('🇰🇷 Korean', 'lyrics_lang_ko')
    .row()
    .text('🇮🇳 Hindi', 'lyrics_lang_hi')
    .text('🇧🇷 Portuguese', 'lyrics_lang_pt')
    .row()
    .text('🇷🇺 Russian', 'lyrics_lang_ru');

  await ctx.reply(
    '📝 *Lyrics Generator*\n\n' +
      'Cost: 1 credit\n\n' +
      'Send me a theme or description for your song, ' +
      'and I\'ll generate lyrics for you!\n\n' +
      'Examples:\n' +
      '• "Summer rain and lost love"\n' +
      '• "Party anthem for Friday night"\n' +
      '• "Melancholic indie folk about mountains"\n\n' +
      'Select language below, then type your theme:',
    { parse_mode: 'Markdown', reply_markup: keyboard },
  );
};

// Store pending lyrics requests in session
export const handleLyricsLanguage = async (ctx: Context) => {
  const match = ctx.callbackQuery?.data?.match(/lyrics_lang_(\w+)/);
  if (!match) return;

  const language = match[1];

  // Store in session for next message
  (ctx as any).session.lyricsLanguage = language;

  await ctx.answerCallbackQuery(`Language: ${language.toUpperCase()}`);
  await ctx.reply(
    `✅ Language set!\n\n` +
      `Now send me your song theme or description.\n` +
      `For example: "Summer rain and lost love"`,
  );
};

// Handle lyrics generation request
export const handleLyricsRequest = async (ctx: Context) => {
  // Check if we're waiting for a lyrics theme
  const language = (ctx as any).session?.lyricsLanguage;
  if (!language) return false; // Not in lyrics flow

  const user = ctx.user;
  if (!user) {
    await ctx.reply('❌ User not found');
    return true;
  }

  const theme = ctx.message?.text?.trim();
  if (!theme) {
    await ctx.reply('❌ Please send a valid theme description.');
    return true;
  }

  // Validate theme length
  if (theme.length < 5 || theme.length > 500) {
    await ctx.reply(
      '❌ Theme should be between 5 and 500 characters.',
    );
    return true;
  }

  // Check credits again
  if (user.credits < 1) {
    await ctx.reply(
      '❌ Not enough credits!\n\n' +
        'Generating lyrics costs 1 credit.\n' +
        'Use /buy to purchase more credits.',
    );
    delete (ctx as any).session.lyricsLanguage;
    return true;
  }

  // Show processing message
  const processingMsg = await ctx.reply(
    '🎵 Generating lyrics...',
  );

  try {
    // Generate lyrics via Gemini API
    const result = await geminiClient.generateLyrics({ theme, language });
    const lyrics = result.lyrics;

    // Deduct 1 credit
    await prisma.user.update({
      where: { id: user.id },
      data: { credits: { decrement: 1 } },
    });

    // Log transaction
    await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        amount: -1,
        type: 'spend',
        description: 'Lyrics generation',
      },
    });

    // Delete processing message
    await ctx.api.deleteMessage(ctx.chat!.id, processingMsg.message_id);

    // Send lyrics with action buttons
    const keyboard = new InlineKeyboard()
      .text('🔄 Regenerate', 'lyrics_regenerate')
      .row()
      .text('🎵 Create Track with These Lyrics', 'lyrics_create_track');

    await ctx.reply(
      `📝 *Generated Lyrics*\n\n` +
        `Theme: "${theme}"\n` +
        `Language: ${language.toUpperCase()}\n\n` +
        '```\n' +
        lyrics +
        '```',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    );

    // Clear session
    delete (ctx as any).session.lyricsLanguage;
  } catch (error) {
    console.error('[Lyrics Generation Error]', error);
    await ctx.api.editMessageText(
      ctx.chat!.id,
      processingMsg.message_id,
      '❌ Failed to generate lyrics. Please try again.',
    );
    delete (ctx as any).session.lyricsLanguage;
  }

  return true;
};

// Handle regenerate button
export const handleLyricsRegenerate = async (ctx: Context) => {
  await ctx.answerCallbackQuery('Feature coming soon!');
  await ctx.reply(
    '♻️ To regenerate lyrics, simply run /lyrics again with the same or a different theme.',
  );
};

// Handle create track button
export const handleLyricsCreateTrack = async (ctx: Context) => {
  await ctx.answerCallbackQuery('Starting track creation...');
  await ctx.reply(
    '🎵 Great! Let\'s create a track with your lyrics.\n\n' +
      'Copy the lyrics above and then use /create to start the track creation process. ' +
      'When asked for lyrics, choose "✍️ Enter custom lyrics" and paste the generated lyrics.',
  );
};