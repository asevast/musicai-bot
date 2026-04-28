import { Context, InlineKeyboard } from 'grammy';
import { prisma } from '@musicai/database';
import { randomUUID } from 'crypto';

const API_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * Create a batch of 3 clip variants for the same prompt
 * SPEC §13.3: 3-variant batch clip generation
 */
export const batchCommand = async (ctx: Context) => {
  const user = (ctx as any).user;
  if (!user) {
    return ctx.reply('❌ Error: User not found');
  }

  // Check if user has enough credits (3 clips × 1 credit = 3 credits)
  if (user.credits < 3) {
    return ctx.reply(
      `❌ Not enough credits!\n\n` +
      `Batch generation requires 3 credits (3 clips × 1 credit).\n` +
      `You have: ${user.credits} credits\n\n` +
      `Use /buy to purchase more credits.`
    );
  }

  // Check daily limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const createdToday = await prisma.track.count({
    where: {
      userId: user.id,
      createdAt: { gte: today },
    },
  });

  const dailyLimit = user.subscriptionTier === 'free' ? 3 : user.subscriptionTier === 'pro' ? 20 : 50;
  if (createdToday + 3 > dailyLimit) {
    return ctx.reply(
      `❌ Daily limit would be exceeded!\n\n` +
      `Track limit for ${user.subscriptionTier} tier: ${dailyLimit}/day\n` +
      `Already created today: ${createdToday}\n` +
      `Batch generation creates 3 tracks.`
    );
  }

  // Store batch state for next message
  (ctx as any).session = (ctx as any).session || {};
  (ctx as any).session.awaitingBatchPrompt = true;

  await ctx.reply(
    `🎲 *Batch Clip Generation*\n\n` +
    `I'll create *3 different variants* of a 30-second clip based on your prompt.\n` +
    `Cost: *3 credits* (3 × 1 credit per clip)\n\n` +
    `📝 *Describe your track:*\n\n` +
    `Genre, mood, instruments, atmosphere...\n\n` +
    `*Example:* Lo-fi hip hop, soft piano, vinyl crackle, 75 BPM, study mood`,
    { parse_mode: 'Markdown' }
  );
};

/**
 * Handle batch prompt input and create 3 tracks
 */
export const handleBatchPrompt = async (ctx: Context): Promise<boolean> => {
  const session = (ctx as any).session;
  if (!session?.awaitingBatchPrompt) return false;

  const user = (ctx as any).user;
  if (!user) {
    await ctx.reply('❌ Error: User not found');
    delete session.awaitingBatchPrompt;
    return true;
  }

  const prompt = ctx.message?.text;
  if (!prompt || prompt.length < 10 || prompt.length > 1000) {
    await ctx.reply('❌ Prompt must be between 10 and 1000 characters. Please try again.');
    return true;
  }

  delete session.awaitingBatchPrompt;

  const batchGroupId = randomUUID().slice(0, 8);
  const statusMsg = await ctx.reply(
    `🎲 Creating batch *${batchGroupId}*...\n\n` +
    `Patience you must have, young padawan...`
  );

  // Create 3 tracks
  const trackIds: string[] = [];
  const errors: string[] = [];

  for (let i = 1; i <= 3; i++) {
    try {
      const response = await fetch(`${API_URL}/tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Id': user.telegramId.toString(),
        },
        body: JSON.stringify({
          model: 'lyria-3-clip-preview',
          type: 'clip',
          prompt,
          telegramId: user.telegramId.toString(),
          chatId: ctx.chat?.id,
          messageId: i === 1 ? statusMsg.message_id : undefined,
          batchGroupId,
          batchIndex: i,
          batchTotal: 3,
        }),
      });

      if (response.ok) {
        const track = await response.json() as { id: string };
        trackIds.push(track.id);
      } else {
        errors.push(`Variant ${i}: ${await response.text()}`);
      }
    } catch (err) {
      errors.push(`Variant ${i}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (trackIds.length === 0) {
    await ctx.reply(
      `❌ Failed to create any variants:\n${errors.join('\n')}`
    );
    return true;
  }

  await ctx.reply(
    `✅ *Batch ${batchGroupId} started!*\n\n` +
    `Created ${trackIds.length}/3 variants.\n` +
    `Track IDs: ${trackIds.map(id => '`' + id.slice(0, 8) + '...`').join(', ')}\n\n` +
    `You will be notified when all tracks are ready.`,
    { parse_mode: 'Markdown' }
  );

  // Store batch info for completion handling
  await prisma.$transaction(
    trackIds.map((trackId, idx) =>
      prisma.track.update({
        where: { id: trackId },
        data: {
          parameters: {
            batchGroupId,
            batchIndex: idx + 1,
            batchTotal: 3,
            batchPrompt: prompt.slice(0, 100),
          },
        },
      })
    )
  );

  return true;
};

export const batchActionKeyboard = (trackIds: string[]) => {
  const keyboard = new InlineKeyboard();

  trackIds.forEach((trackId, index) => {
    keyboard.text(`🎵 Variant ${index + 1}`, `play_batch_${trackId}`).row();
  });

  return keyboard
    .text('🔄 Regenerate All', 'batch_regenerate')
    .row()
    .text('❌ Cancel', 'cancel_batch');
};
