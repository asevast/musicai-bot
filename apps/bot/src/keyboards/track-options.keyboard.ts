import { InlineKeyboard } from 'grammy';

export const trackTypeKeyboard = (isPaidUser = false) => {
  const keyboard = new InlineKeyboard().text('✂️ Clip 30s (1 cr)', 'type_clip');

  if (!isPaidUser) {
    return keyboard;
  }

  return keyboard
    .row()
    .text('🎵 Full Song (5 cr)', 'type_full_song')
    .row()
    .text('🎹 Instrumental (3 cr)', 'type_instrumental');
};

export const languageKeyboard = () =>
  new InlineKeyboard()
    .text('🇺🇸 EN', 'lang_en')
    .text('🇩🇪 DE', 'lang_de')
    .text('🇪🇸 ES', 'lang_es')
    .row()
    .text('🇫🇷 FR', 'lang_fr')
    .text('🇯🇵 JA', 'lang_ja')
    .text('🇰🇷 KO', 'lang_ko')
    .row()
    .text('🇮🇳 HI', 'lang_hi')
    .text('🇧🇷 PT', 'lang_pt');

export const intensityKeyboard = () =>
  new InlineKeyboard()
    .text('🔈 Low', 'intensity_low')
    .text('🔉 Medium', 'intensity_medium')
    .row()
    .text('🔊 High', 'intensity_high')
    .text('🔥 Epic', 'intensity_epic');

export const confirmKeyboard = () =>
  new InlineKeyboard()
    .text('✅ Create', 'confirm_create')
    .text('✏️ Edit', 'edit_params')
    .row()
    .text('❌ Cancel', 'cancel_create');

export const trackActionKeyboard = (trackId: string) =>
  new InlineKeyboard()
    .text('🔄 Regenerate', `regen_${trackId}`)
    .text('📤 Share', `share_${trackId}`)
    .row()
    .text('📋 Copy Prompt', `copy_${trackId}`)
    .text('❤️ To Library', `library_${trackId}`);
