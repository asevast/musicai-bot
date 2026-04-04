import { InlineKeyboard } from 'grammy';

export const mainMenuKeyboard = () =>
  new InlineKeyboard()
    .text('🎵 Create Track', 'create_track')
    .row()
    .text('📜 History', 'history')
    .text('📚 Library', 'library')
    .row()
    .text('👤 Profile', 'profile')
    .text('⚙️ Settings', 'settings')
    .row()
    .text('💎 Buy Credits', 'buy_credits');
