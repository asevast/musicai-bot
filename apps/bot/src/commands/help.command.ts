import type { BotContext } from '../bot';
import type { BotContext } from '../bot';
import { mainMenuKeyboard } from '../keyboards/main-menu.keyboard';

export const helpCommand = async (ctx: BotContext) => {
  const helpText =
    '🎵 *MusicAI Bot Help*\n\n' +
    '*Main Commands:*\n' +
    '/start - Start the bot and view main menu\n' +
    '/create - Create a new music track\n' +
    '/history - View your track history\n' +
    '/library - Browse public tracks from the community\n' +
    '/profile - View your profile and credits\n' +
    '/settings - Configure default settings\n' +
    '/buy - Buy credits or subscribe\n' +
    '/help - Show this help message\n\n' +
    '*Creating Tracks:*\n' +
    '• Use /create to start the track creation wizard\n' +
    '• Choose between Full Song, Clip, or Instrumental\n' +
    '• Describe the music you want in your own words\n' +
    '• Optionally add lyrics or let AI generate them\n' +
    '• Adjust BPM and intensity for fine-tuning\n\n' +
    '*Track Status:*\n' +
    '⏳ Queued - Your track is waiting to be processed\n' +
    '🔄 Processing - AI is generating your music\n' +
    '✅ Ready - Your track is complete and ready to download\n' +
    '❌ Failed - Something went wrong, you can retry\n\n' +
    '*Credits:*\n' +
    '• Each track costs credits based on duration\n' +
    '• Clips (~30s): 1 credit\n' +
    '• Full songs (~3min): 3 credits\n' +
    '• Buy more credits with /buy\n\n' +
    '*Need more help?*\n' +
    'Contact @asevast for support.';

  await ctx.reply(helpText, {
    parse_mode: 'Markdown',
    reply_markup: mainMenuKeyboard(),
  });
};
