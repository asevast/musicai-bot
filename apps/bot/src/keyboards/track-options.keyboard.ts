import { InlineKeyboard } from 'grammy';

export const trackTypeKeyboard = (isPaidUser = false) => {
  const keyboard = new InlineKeyboard()
    .text('✂️ Clip 30s (1 cr)', 'type_clip')
    .row()
    .text('🎲 Three Variants (3 cr)', 'type_batch');

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
    .text('🇷🇺 RU', 'lang_ru')
    .text('🇺🇸 EN', 'lang_en')
    .text('🇩🇪 DE', 'lang_de')
    .row()
    .text('🇪🇸 ES', 'lang_es')
    .text('🇫🇷 FR', 'lang_fr')
    .text('🇯🇵 JA', 'lang_ja')
    .row()
    .text('🇰🇷 KO', 'lang_ko')
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

export const lyricsKeyboard = () =>
  new InlineKeyboard()
    .text('✍️ Enter custom lyrics', 'lyrics_custom')
    .row()
    .text('🤖 Auto-generate lyrics', 'lyrics_auto')
    .row()
    .text('⏭ Skip lyrics', 'lyrics_skip');

export const additionalSettingsKeyboard = (isPro = false) => {
  const keyboard = new InlineKeyboard()
    .text('🎯 BPM', 'settings_bpm')
    .text('🎚️ Intensity', 'settings_intensity');

  if (isPro) {
    keyboard.row().text('⏱ Duration', 'settings_duration');
  }

  return keyboard
    .row()
    .text('🚫 Negative Prompt', 'settings_negative')
    .row()
    .text('⏭ Skip Advanced', 'settings_skip');
};

export const trackActionKeyboard = (trackId: string) =>
  new InlineKeyboard()
    .text('🔄 Regenerate', `regen_${trackId}`)
    .text('📤 Share', `share_${trackId}`)
    .row()
    .text('📋 Copy Prompt', `copy_prompt_${trackId}`)
    .text('❤️ To Library', `library_${trackId}`);
