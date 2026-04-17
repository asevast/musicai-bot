import { InlineKeyboard } from 'grammy';

export interface TrackCardData {
  id: string;
  index: number;
  type: string;
  status: string;
  prompt: string;
  durationSec?: number | null;
  createdAt: Date;
  gcsUrl?: string | null;
}

const statusEmoji: Record<string, string> = {
  queued: '⏳',
  processing: '🔄',
  done: '✅',
  failed: '❌',
};

const typeEmoji: Record<string, string> = {
  full_song: '🎵',
  clip: '🎬',
  instrumental: '🎹',
};

const typeLabel: Record<string, string> = {
  full_song: 'Full Song',
  clip: 'Clip',
  instrumental: 'Instrumental',
};

/**
 * Build track card text (for display in message)
 */
export const buildTrackCardText = (track: TrackCardData): string => {
  const emoji = statusEmoji[track.status] || '⏳';
  const typeIcon = typeEmoji[track.type] || '🎵';
  const typeName = typeLabel[track.type] || track.type;
  const duration = track.durationSec ? `${track.durationSec}s` : '';
  const date = track.createdAt.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });

  let text = `${emoji} #${track.index} — ${typeName}\n`;
  text += `${typeIcon} ${track.prompt.slice(0, 50)}${track.prompt.length > 50 ? '...' : ''}\n`;
  text += `⏱️ ${duration} · 📅 ${date}`;

  return text;
};

/**
 * Add track action buttons to an existing keyboard
 * This appends buttons for a single track to the keyboard
 */
export const addTrackButtons = (keyboard: InlineKeyboard, track: TrackCardData): void => {
  if (track.status === 'done' && track.gcsUrl) {
    // Download button (full width)
    keyboard.text('⬇️ Download', `download_${track.id}`).row();

    // Secondary actions (2 columns)
    keyboard
      .text('🔄 Regen', `regen_${track.id}`)
      .text('📤 Share', `share_${track.id}`)
      .row()
      .text('📋 Copy Prompt', `copy_prompt_${track.id}`)
      .text('❤️ Library', `add_to_library_${track.id}`)
      .row();

    // Extend button (full width, only for clips)
    if (track.type === 'clip') {
      keyboard.text('🎼 Extend to Full Song', `extend_${track.id}`).row();
    }
  } else if (track.status === 'processing' || track.status === 'queued') {
    keyboard.text('🔄 Refresh Status', `refresh_track_${track.id}`).row();
  } else if (track.status === 'failed') {
    keyboard
      .text('🔄 Retry', `retry_${track.id}`)
      .text('🗑️ Delete', `delete_track_${track.id}`)
      .row();
  }
};

/**
 * Build pagination controls for track list
 */
export const buildPaginationRow = (
  keyboard: InlineKeyboard,
  currentPage: number,
  totalPages: number,
  filter?: string
): void => {
  if (totalPages > 1) {
    const prevPage = currentPage > 1 ? currentPage - 1 : 1;
    const nextPage = currentPage < totalPages ? currentPage + 1 : totalPages;

    keyboard
      .text('⬅️ Prev', `history_page_${filter || 'all'}_${prevPage}`)
      .text(`${currentPage} / ${totalPages}`, 'noop')
      .text('Next ➡️', `history_page_${filter || 'all'}_${nextPage}`)
      .row();
  }

  // Summary button
  keyboard.text('📊 Summary', `history_summary`).row();

  // Back to menu
  keyboard.text('⬅️ Back to Menu', 'main_menu');
};

/**
 * Build summary footer text showing track counts
 */
export const buildSummaryText = (
  ready: number,
  inProgress: number,
  total: number,
  page: number,
  totalPages: number
): string => {
  return `\n📊 Summary (page ${page}/${totalPages}): ${ready} ready · ${inProgress} in progress · ${total} total`;
};
