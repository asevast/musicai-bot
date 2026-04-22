import type { Context } from 'grammy';

export const imageToMusicCommand = async (ctx: Context) => {
  await ctx.reply(
    '📸 *Image to Music*\n\nSend me an image and I\'ll generate music inspired by it.',
    { parse_mode: 'Markdown' }
  );
};
