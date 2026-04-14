import { InlineKeyboard } from 'grammy';
import type { NotificationMode, UserSettings } from '../utils/user-settings';

export const mainMenuKeyboard = () =>
  new InlineKeyboard()
    .text('🎵 Create New Track', 'create_track')
    .row()
    .text('📜 My Tracks', 'history')
    .text('🌍 Public Library', 'library')
    .row()
    .text('👤 My Profile', 'profile')
    .text('⚙️ Settings', 'settings')
    .row()
    .text('💎 Buy Credits', 'buy_credits');

export const createMenuKeyboard = () =>
  new InlineKeyboard()
    .text('🎤 Full Song', 'create_track')
    .text('🎹 Instrumental', 'create_track')
    .row()
    .text('🎬 Clip Preview (30s)', 'create_track')
    .row()
    .text('⬅️ Back to Menu', 'main_menu');

export const historyMenuKeyboard = () =>
  new InlineKeyboard()
    .text('🕐 Recent', 'history')
    .text('✅ Completed', 'history_done')
    .row()
    .text('⏳ Processing', 'history_processing')
    .text('❌ Failed', 'history_failed')
    .row()
    .text('⬅️ Back to Menu', 'main_menu');

export const profileMenuKeyboard = () =>
  new InlineKeyboard()
    .text('📊 Stats', 'profile')
    .text('💳 Transactions', 'profile_transactions')
    .row()
    .text('⬅️ Back to Menu', 'main_menu');

export const settingsMenuKeyboard = () =>
  new InlineKeyboard()
    .text('🌐 Default Language', 'settings_language')
    .text('🎚️ Default Intensity', 'settings_intensity')
    .row()
    .text('🔔 Notifications', 'settings_notifications')
    .text('🎭 Default Model', 'settings_model')
    .row()
    .text('⬅️ Back to Menu', 'main_menu');

export const settingsLanguageKeyboard = (current?: string) =>
  new InlineKeyboard()
    .text(`${current === 'en' ? '✓ ' : ''}EN`, 'set_language_en')
    .text(`${current === 'de' ? '✓ ' : ''}DE`, 'set_language_de')
    .text(`${current === 'es' ? '✓ ' : ''}ES`, 'set_language_es')
    .row()
    .text(`${current === 'fr' ? '✓ ' : ''}FR`, 'set_language_fr')
    .text(`${current === 'ja' ? '✓ ' : ''}JA`, 'set_language_ja')
    .text(`${current === 'ko' ? '✓ ' : ''}KO`, 'set_language_ko')
    .row()
    .text(`${current === 'hi' ? '✓ ' : ''}HI`, 'set_language_hi')
    .text(`${current === 'pt' ? '✓ ' : ''}PT`, 'set_language_pt')
    .row()
    .text('⬅️ Back to Settings', 'settings');

export const settingsIntensityKeyboard = (current?: UserSettings['intensity']) =>
  new InlineKeyboard()
    .text(`${current === 'low' ? '✓ ' : ''}Low`, 'set_intensity_low')
    .text(`${current === 'medium' ? '✓ ' : ''}Medium`, 'set_intensity_medium')
    .row()
    .text(`${current === 'high' ? '✓ ' : ''}High`, 'set_intensity_high')
    .text(`${current === 'epic' ? '✓ ' : ''}Epic`, 'set_intensity_epic')
    .row()
    .text('⬅️ Back to Settings', 'settings');

export const settingsNotificationsKeyboard = (current?: NotificationMode) =>
  new InlineKeyboard()
    .text(`${current === 'all' ? '✓ ' : ''}All`, 'set_notifications_all')
    .text(
      `${current === 'important' ? '✓ ' : ''}Important`,
      'set_notifications_important'
    )
    .row()
    .text(`${current === 'off' ? '✓ ' : ''}Off`, 'set_notifications_off')
    .row()
    .text('⬅️ Back to Settings', 'settings');

export const settingsModelKeyboard = (current?: UserSettings['model']) =>
  new InlineKeyboard()
    .text(
      `${current === 'lyria-3-clip-preview' ? '✓ ' : ''}Clip`,
      'set_model_lyria-3-clip-preview'
    )
    .row()
    .text(
      `${current === 'lyria-3-pro-preview' ? '✓ ' : ''}Pro`,
      'set_model_lyria-3-pro-preview'
    )
    .row()
    .text('⬅️ Back to Settings', 'settings');

export const creditsMenuKeyboard = () =>
  new InlineKeyboard()
    .text('🌟 Pack S - 20 cr (79₽)', 'buy_pack_s')
    .text('💎 Pack M - 100 cr (299₽)', 'buy_pack_m')
    .row()
    .text('👑 Pack L - 300 cr (699₽)', 'buy_pack_l')
    .row()
    .text('📅 Pro - 150 cr/mo (299₽)', 'buy_pro')
    .text('♾️ Unlimited (799₽)', 'buy_unlimited')
    .row()
    .text('⬅️ Back to Menu', 'main_menu');
