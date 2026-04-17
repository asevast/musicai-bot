import { InlineKeyboard } from 'grammy';
import { prisma } from '@musicai/database';
import type { BotContext } from '../bot';

const TRACKS_PER_PAGE = 5;

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

  // Escape Markdown special characters in prompt
  const escapedPrompt =
    track.prompt.replace(/([_*[\]()~`>#+-=|{}.!])/g, '\\$1').slice(0, 50) +
    (track.prompt.length > 50 ? '...' : '');

  let text = `${emoji} #${track.index} — ${typeName}\n`;
  text += `${typeIcon} ${escapedPrompt}\n`;
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

    // Prev button - disabled on first page
    if (currentPage > 1) {
      keyboard.text('⬅️ Prev', `history_page_${filter || 'all'}_${prevPage}`);
    } else {
      keyboard.text('⏹️ Prev', 'noop');
    }

    // Page indicator (always disabled)
    keyboard.text(`${currentPage} / ${totalPages}`, 'noop');

    // Next button - disabled on last page
    if (currentPage < totalPages) {
      keyboard.text('Next ➡️', `history_page_${filter || 'all'}_${nextPage}`);
    } else {
      keyboard.text('Next ⏹️', 'noop');
    }

    keyboard.row();
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

  // Build track list text (no Markdown parsing to avoid issues with user content)
  let messageText = `📜 Your Tracks (page ${page}/${totalPages})\n\n`;
  messageText += `✅ Ready: ${readyCount} · 🔄 In Progress: ${inProgressCount} · 📊 Total: ${totalCount}\n\n`;

  tracks.forEach((track, index) => {
    const trackIndex = skip + index + 1;
    messageText += buildTrackText({
      index: trackIndex,
      type: track.type,
      status: track.status,
      prompt: track.prompt,
      durationSec: track.durationSec,
      createdAt: track.createdAt,
    });
    messageText += '\n\n';
  });

  messageText += 'Use /track_<number> to download or manage a specific track.';

  const paginationKeyboard = buildPaginationKeyboard(page, totalPages, filter);

  // Send or edit message (no parse_mode to avoid Markdown issues)
  if (ctx.callbackQuery) {
    await ctx.editMessageText(messageText, {
      reply_markup: paginationKeyboard,
    });
  } else {
    await ctx.reply(messageText, {
      reply_markup: paginationKeyboard,
    });
  }
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
  await ctx.reply(message, { parse_mode: 'Markdown' });
};
