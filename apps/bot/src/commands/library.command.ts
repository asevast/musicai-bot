import { Context } from 'grammy';
import { prisma } from '@musicai/database';

export const libraryCommand = async (ctx: Context) => {
  const tracks = await prisma.track.findMany({
    where: { isPublic: true, status: 'done' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      user: {
        select: {
          username: true,
          firstName: true,
        },
      },
    },
  });

  if (tracks.length === 0) {
    return ctx.reply(
      '📚 *Community Library*\n\n' +
        'No public tracks yet. Be the first to share your creation!\n\n' +
        'Use /create to generate a track and add it to the library.',
      { parse_mode: 'Markdown' }
    );
  }

  let message = '📚 *Community Library*\n\n';

  tracks.forEach((track, index) => {
    const displayName = track.user.username || track.user.firstName || 'Anonymous';
    message += `${index + 1}. ${track.type}\n`;
    message += `   by @${displayName}\n`;
    message += `   ${track.prompt.slice(0, 40)}...\n`;
    if (track.gcsUrl) {
      message += `   🎧 [Listen](${track.gcsUrl})\n`;
    }
    message += '\n';
  });

  await ctx.reply(message, { parse_mode: 'Markdown' });
};
