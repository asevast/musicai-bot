import { InlineKeyboard } from 'grammy';
import { prisma } from '@musicai/database';
import type { BotContext } from '../bot';

const TRACKS_PER_PAGE = 2;

interface HistoryOptions {
  page?: number;
  filter?: 'all' | 'done' | 'processing' | 'failed' | 'queued';
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
 * Build a single track's inline keyboard
 */
const buildTrackKeyboard = (track: {
  id: string;
  type: string;
  status: string;
  gcsUrl?: string | null;
}): InlineKeyboard => {
  const keyboard = new InlineKeyboard();

  if (track.status === 'done' && track.gcsUrl) {
    // Download button (full width)
    keyboard.text('⬇️ Download', `download_${track.id}`).row();

    // Secondary actions (2x2 grid)
    keyboard
      .text('🔄 Regen', `regen_${track.id}`)
      .text('📤 Share', `share_${track.id}`)
      .row()
      .text('📋 Copy Prompt', `copy_prompt_${track.id}`)
      .text('❤️ Library', `add_to_library_${track.id}`)
      .row();

    // Extend button (only for clips)
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

  return keyboard;
};

/**
 * Build track card text
 */
const buildTrackText = (track: {
  index: number;
  type: string;
  status: string;
  prompt: string;
  durationSec?: number | null;
  createdAt: Date;
}): string => {
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
 * Build pagination keyboard for summary message
 */
const buildPaginationKeyboard = (
  currentPage: number,
  totalPages: number,
  filter?: string
): InlineKeyboard => {
  const keyboard = new InlineKeyboard();

  if (totalPages > 1) {
    const prevPage = currentPage > 1 ? currentPage - 1 : 1;
    const nextPage = currentPage < totalPages ? currentPage + 1 : totalPages;

    keyboard
      .text('⬅️ Prev', `history_page_${filter || 'all'}_${prevPage}`)
      .text(`${currentPage} / ${totalPages}`, 'noop')
      .text('Next ➡️', `history_page_${filter || 'all'}_${nextPage}`)
      .row();
  }

  keyboard.text('📊 Summary', `history_summary`).row();
  keyboard.text('⬅️ Back to Menu', 'main_menu');

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
  const statusFilter: any = {};
  if (filter !== 'all') {
    statusFilter.status = filter;
  }

  // Get total counts
  const totalCount = await prisma.track.count({
    where: { userId: user.id, ...statusFilter },
  });

  const readyCount = await prisma.track.count({
    where: { userId: user.id, status: 'done' },
  });

  const inProgressCount = await prisma.track.count({
    where: {
      userId: user.id,
      status: { in: ['queued', 'processing'] },
    },
  });

  if (totalCount === 0) {
    const emptyKeyboard = new InlineKeyboard()
      .text('🎵 Create New Track', 'create_track')
      .row()
      .text('⬅️ Back to Menu', 'main_menu');

    return ctx.reply(
      '📜 *No Tracks Yet*\n\nYou have not created any tracks yet. Start your music journey now!',
      { reply_markup: emptyKeyboard }
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

  // If this is a callback (pagination), delete previous messages and resend
  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
  }

  // Send header
  const headerText =
    `📜 *Your Tracks* (page ${page}/${totalPages})\n\n` +
    `✅ Ready: ${readyCount} · 🔄 In Progress: ${inProgressCount} · 📊 Total: ${totalCount}`;

  await ctx.reply(headerText);

  // Send each track as a separate message with its own keyboard
  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const trackIndex = skip + i + 1;

    const trackText = buildTrackText({
      index: trackIndex,
      type: track.type,
      status: track.status,
      prompt: track.prompt,
      durationSec: track.durationSec,
      createdAt: track.createdAt,
    });

    const trackKeyboard = buildTrackKeyboard({
      id: track.id,
      type: track.type,
      status: track.status,
      gcsUrl: track.gcsUrl,
    });

    await ctx.reply(trackText, {
      reply_markup: trackKeyboard,
    });
  }

  // Send pagination controls as a separate message
  const paginationKeyboard = buildPaginationKeyboard(page, totalPages, filter);
  await ctx.reply('Use buttons below to navigate:', {
    reply_markup: paginationKeyboard,
  });
};

// Handler for history page navigation
export const handleHistoryPage = async (ctx: BotContext) => {
  const match = ctx.callbackQuery?.data?.match(/history_page_(\w+)_(\d+)/);
  if (!match) return;

  const [, filter, pageStr] = match;
  const page = parseInt(pageStr, 10);

  await ctx.answerCallbackQuery('Loading...');
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
    `❌ *Failed*: ${statusCounts['failed'] || 0} tracks\n` +
    `⏳ *Queued*: ${statusCounts['queued'] || 0} tracks\n\n` +
    `📈 *Total*: ${total} tracks`;

  await ctx.answerCallbackQuery();
  await ctx.reply(message);
};
