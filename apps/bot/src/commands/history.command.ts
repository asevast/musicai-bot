import { Context } from 'grammy';
import { prisma } from '@musicai/database';

export const historyCommand = async (ctx: Context) => {
  const user = ctx.user;
  if (!user) {
    return ctx.reply('Error: User not found');
  }

  const tracks = await prisma.track.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  if (tracks.length === 0) {
    return ctx.reply('📜 *No tracks yet.*\n\nUse /create to generate your first track!', {
      parse_mode: 'Markdown',
    });
  }

  let message = '📜 *Your Recent Tracks:*\n\n';

  tracks.forEach((track, index) => {
    const statusEmoji = {
      queued: '⏳',
      processing: '🔄',
      done: '✅',
      failed: '❌',
    }[track.status];

    message += `${index + 1}. ${statusEmoji} ${track.type}\n`;
    message += `   ${track.prompt.slice(0, 40)}...\n`;
    if (track.status === 'done' && track.gcsUrl) {
      message += `   🎧 [Listen](${track.gcsUrl})\n`;
    }
    message += '\n';
  });

  await ctx.reply(message, { parse_mode: 'Markdown' });
};
