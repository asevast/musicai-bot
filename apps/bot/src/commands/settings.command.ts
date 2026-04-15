import { Context } from 'grammy';
import { prisma } from '@musicai/database';
import { settingsMenuKeyboard } from '../keyboards/main-menu.keyboard';
import { buildSettingsSummary, parseUserSettings } from '../utils/user-settings';

export const settingsCommand = async (ctx: Context) => {
  const user = ctx.user;
  if (!user) {
    return ctx.reply('Error: User not found');
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { defaultSettings: true },
  });
  const settings = parseUserSettings(dbUser?.defaultSettings);

  await ctx.reply(`⚙️ *Settings*\n\n${buildSettingsSummary(settings)}\n\nSelect an option:`, {
    parse_mode: 'Markdown',
    reply_markup: settingsMenuKeyboard(),
  });
};
