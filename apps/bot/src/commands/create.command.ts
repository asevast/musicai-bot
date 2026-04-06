import { Context } from 'grammy';
import { createTrackScene } from '../scenes/create-track.scene';

export const createCommand = async (ctx: Context & { conversation?: any }) => {
  await ctx.conversation!.enter('create-track');
};

export { createTrackScene };
