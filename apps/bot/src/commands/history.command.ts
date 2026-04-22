import { InlineKeyboard } from 'grammy';
import { prisma } from '@musicai/database';
import type { BotContext } from '../bot';

const TRACKS_PER_PAGE = 5;

interface HistoryOptions {
  page?: number;
  filter?: 'all' | 'done' | 'progress' | 'failed' | 'processing' | 'queued';
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
 * Build a single track line for the list
 */
const buildTrackLine = (track: {
  index: number;
  type: string;
  status: string;
  prompt: string;
  durationSec?: number | null;
  createdAt: Date;
}): string => {
  const emoji = statusEmoji[track.status] || '⏳';
  const typeIcon = typeEmoji[track.type] || '🎵';
  const duration = track.durationSec ? `${track.durationSec}s` : '';
  const date = track.createdAt.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
  });
  const promptPreview = track.prompt.slice(0, 30) + (track.prompt.length > 30 ? '...' : '');

  return `${emoji} #${track.index} ${typeIcon} ${promptPreview} · ${duration || date}`;
};

/**
 * Build pagination keyboard for the list
 */
const buildListKeyboard = (
  tracks: { id: string; status: string; gcsUrl?: string | null; type: string }[],
  page: number,
  totalPages: number,
  filter?: string
): InlineKeyboard => {
  const keyboard = new InlineKeyboard();

  // Add a "View" button for each track on this page
  tracks.forEach((track, index) => {
    const trackNumber = (page - 1) * TRACKS_PER_PAGE + index + 1;
    const statusIcon =
      track.status === 'done' && track.gcsUrl ? '✅' : track.status === 'failed' ? '❌' : '⏳';
    keyboard.text(`${statusIcon} #${trackNumber} Details`, `view_track_${track.id}`).row();
  });

  // Pagination row
  if (totalPages > 1) {
    const prevPage = page > 1 ? page - 1 : 1;
    const nextPage = page < totalPages ? page + 1 : totalPages;

    if (page > 1) {
      keyboard.text('⬅️ Prev', `history_page_${filter || 'all'}_${prevPage}`);
    } else {
      keyboard.text('⏹️ Prev', 'noop');
    }

    keyboard.text(`${page}/${totalPages}`, 'noop');

    if (page < totalPages) {
      keyboard.text('Next ➡️', `history_page_${filter || 'all'}_${nextPage}`);
    } else {
      keyboard.text('Next ⏹️', 'noop');
    }
    keyboard.row();
  }

  // Filter buttons
  keyboard
    .text('✅ Ready', 'history_filter_done')
    .text('🔄 In Progress', 'history_filter_progress')
    .text('❌ Failed', 'history_filter_failed')
    .row();

  keyboard.text('📊 Summary', 'history_summary').text('⬅️ Menu', 'main_menu');

  return keyboard;
};

export const historyCommand = async (ctx: BotContext) => {
  await showHistoryPage(ctx, { page: 1, filter: 'all' });
};

export const showHistoryPage = async (
  ctx: BotContext,
  options: HistoryOptions = { page: 1, filter: 'all' }
) => {
  const user = ctx.user;
  if (!user) {
    return ctx.reply('❌ Error: User not found');
  }

  const { page = 1, filter = 'all' } = options;

  // Build status filter
  let statusFilter: any = {};
  if (filter === 'done') {
    statusFilter = { status: 'done' };
  } else if (filter === 'progress') {
    statusFilter = { status: { in: ['queued', 'processing'] } };
  } else if (filter === 'failed') {
    statusFilter = { status: 'failed' };
  }

  // Get total counts
  const totalCount = await prisma.track.count({
    where: { userId: user.id, ...statusFilter },
  });

  // Get total counts (for all tracks)
  const totalReady = await prisma.track.count({
    where: { userId: user.id, status: 'done' },
  });
  const totalInProgress = await prisma.track.count({
    where: {
      userId: user.id,
      status: { in: ['queued', 'processing'] },
    },
  });
  const totalFailed = await prisma.track.count({
    where: { userId: user.id, status: 'failed' },
  });

  if (totalCount === 0) {
    const emptyKeyboard = new InlineKeyboard()
      .text('🎵 Create New Track', 'create_track')
      .row()
      .text('⬅️ Back to Menu', 'main_menu');

    return ctx.reply(
      '📜 *No Tracks Yet*\n\nYou have not created any tracks yet. Start your music journey now!',
      { parse_mode: 'Markdown', reply_markup: emptyKeyboard }
    );
  }

  // Fetch tracks for current page
  const skip = (page - 1) * TRACKS_PER_PAGE;
  const tracks = await prisma.track.findMany({
    where: { userId: user.id, ...statusFilter },
    orderBy: { createdAt: 'desc' },
    take: TRACKS_PER_PAGE,
    skip,
  });

  const totalPages = Math.ceil(totalCount / TRACKS_PER_PAGE);

  // Build track list text
  const filterLabel: Record<string, string> = {
    all: 'All Tracks',
    done: '✅ Ready Tracks',
    progress: '🔄 In Progress',
    failed: '❌ Failed Tracks',
  };

  let messageText = `📜 ${filterLabel[filter] || 'Your Tracks'}\n\n`;
  messageText += `Showing ${tracks.length} of ${totalCount} tracks\n\n`;
  messageText += `Total: ✅ ${totalReady} · 🔄 ${totalInProgress} · ❌ ${totalFailed}\n\n`;

  tracks.forEach((track, index) => {
    messageText +=
      buildTrackLine({
        index: skip + index + 1,
        type: track.type,
        status: track.status,
        prompt: track.prompt,
        durationSec: track.durationSec,
        createdAt: track.createdAt,
      }) + '\n';
  });

  const keyboard = buildListKeyboard(tracks, page, totalPages, filter);

  // Send or edit message
  if (ctx.callbackQuery) {
    await ctx.editMessageText(messageText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } else {
    await ctx.reply(messageText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }
};

// Handler for viewing a specific track
export const handleViewTrack = async (ctx: BotContext) => {
  const match = ctx.callbackQuery?.data?.match(/view_track_(.+)/);
  if (!match) return;

  const trackId = match[1];
  const user = ctx.user;
  if (!user) return ctx.answerCallbackQuery('❌ User not found');

  const track = await prisma.track.findFirst({
    where: { id: trackId, userId: user.id },
  });

  if (!track) {
    return ctx.answerCallbackQuery('❌ Track not found');
  }

  const statusEmoji: Record<string, string> = {
    queued: '⏳',
    processing: '🔄',
    done: '✅',
    failed: '❌',
  };

  const typeLabel: Record<string, string> = {
    full_song: 'Full Song',
    clip: 'Clip',
    instrumental: 'Instrumental',
  };

  const duration = track.durationSec ? `${track.durationSec}s` : 'N/A';
  const date = track.createdAt.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });

  let message = `${statusEmoji[track.status] || '⏳'} <b>Track Details</b>\n\n`;
  message += `<b>Type:</b> ${typeLabel[track.type] || track.type}\n`;
  message += `<b>Status:</b> ${track.status}\n`;
  message += `<b>Duration:</b> ${duration}\n`;
  message += `<b>Created:</b> ${date}\n\n`;
  message += `<b>Prompt:</b> ${track.prompt.slice(0, 200)}${track.prompt.length > 200 ? '...' : ''}\n`;

  if (track.lyrics) {
    message += `\n<b>Lyrics:</b> ${track.lyrics.slice(0, 200)}${track.lyrics.length > 200 ? '...' : ''}\n`;
  }

  // Build action keyboard
  const keyboard = new InlineKeyboard();

  if (track.status === 'done' && track.gcsUrl) {
    keyboard.text('⬇️ Download', `download_${track.id}`).row();
    keyboard
      .text('🔄 Regen', `regen_${track.id}`)
      .text('📤 Share', `share_${track.id}`)
      .row()
      .text('📋 Copy Prompt', `copy_prompt_${track.id}`)
      .text('❤️ Library', `add_to_library_${track.id}`)
      .row();
    if (track.type === 'clip') {
      keyboard.text('🎼 Extend to Full Song', `extend_${track.id}`).row();
    }
  } else if (track.status === 'done' && !track.gcsUrl) {
    message += '\n\n⚠️ Track completed but file is missing.';
    keyboard.text('🔄 Retry', `retry_${track.id}`).row();
  } else if (track.status === 'failed') {
    keyboard
      .text('🔄 Retry', `retry_${track.id}`)
      .text('🗑️ Delete', `delete_track_${track.id}`)
      .row();
  } else {
    message += '\n\n⏳ Still processing...';
    keyboard.text('🔄 Refresh', `refresh_track_${track.id}`).row();
  }

  keyboard.text('⬅️ Back to List', 'history');

  await ctx.answerCallbackQuery();
  await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
};

// Handler for filter buttons
export const handleHistoryFilter = async (ctx: BotContext) => {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  let filter: 'all' | 'done' | 'progress' | 'failed' = 'all';
  if (data === 'history_filter_done') filter = 'done';
  else if (data === 'history_filter_progress') filter = 'progress';
  else if (data === 'history_filter_failed') filter = 'failed';

  await ctx.answerCallbackQuery();
  await showHistoryPage(ctx, { page: 1, filter });
};

// Handler for history page navigation
export const handleHistoryPage = async (ctx: BotContext) => {
  const match = ctx.callbackQuery?.data?.match(/history_page_(\w+)_(\d+)/);
  if (!match) return;

  const [, filter, pageStr] = match;
  const page = parseInt(pageStr, 10);

  await ctx.answerCallbackQuery();
  await showHistoryPage(ctx, {
    page,
    filter: filter as any,
  });
};

// Handler for history summary view
export const handleHistorySummary = async (ctx: BotContext) => {
  const user = ctx.user;
  if (!user) {
    return ctx.answerCallbackQuery('❌ User not found');
  }

  const counts = await prisma.track.groupBy({
    by: ['status'],
    where: { userId: user.id },
    _count: { status: true },
  });

  const statusCounts: Record<string, number> = {};
  let total = 0;
  counts.forEach((c) => {
    statusCounts[c.status] = c._count.status;
    total += c._count.status;
  });

  const message =
    '📊 *Track Summary*\n\n' +
    `✅ *Ready*: ${statusCounts['done'] || 0} tracks\n` +
    `🔄 *In Progress*: ${(statusCounts['queued'] || 0) + (statusCounts['processing'] || 0)} tracks\n` +
    `❌ *Failed*: ${statusCounts['failed'] || 0} tracks\n\n` +
    `📈 *Total*: ${total} tracks`;

  await ctx.answerCallbackQuery();
  await ctx.reply(message, { parse_mode: 'Markdown' });
};
