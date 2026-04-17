import { InlineKeyboard } from 'grammy';
import { prisma } from '@musicai/database';
import type { BotContext } from '../bot';
import {
  buildTrackCardText,
  addTrackButtons,
  buildPaginationRow,
  buildSummaryText,
} from '../keyboards/track-card.keyboard';

const TRACKS_PER_PAGE = 2; // Show 2 tracks per page (as in screenshot)

interface HistoryOptions {
  page?: number;
  filter?: 'all' | 'done' | 'processing' | 'failed' | 'queued';
}

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

  // Get total counts for summary
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
      '📜 *No Tracks Yet*\n\n' + "You haven't created any tracks. Start your music journey now!",
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

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / TRACKS_PER_PAGE);

  // Build single keyboard for entire message
  const keyboard = new InlineKeyboard();

  // Build track cards text
  let messageText = '';

  tracks.forEach((track, index) => {
    // Add track card text
    messageText +=
      buildTrackCardText({
        id: track.id,
        index: skip + index + 1,
        type: track.type,
        status: track.status,
        prompt: track.prompt,
        durationSec: track.durationSec,
        createdAt: track.createdAt,
        gcsUrl: track.gcsUrl,
      }) + '\n\n';

    // Add buttons for this track to the shared keyboard
    addTrackButtons(keyboard, {
      id: track.id,
      index: skip + index + 1,
      type: track.type,
      status: track.status,
      prompt: track.prompt,
      durationSec: track.durationSec,
      createdAt: track.createdAt,
      gcsUrl: track.gcsUrl,
    });
  });

  // Add summary footer
  messageText += buildSummaryText(
    readyCount,
    inProgressCount,
    await prisma.track.count({ where: { userId: user.id } }),
    page,
    totalPages
  );

  // Add pagination controls
  buildPaginationRow(keyboard, page, totalPages, filter);

  // Send or edit message
  if (ctx.callbackQuery) {
    await ctx.editMessageText(messageText, {
      reply_markup: keyboard,
    });
  } else {
    await ctx.reply(messageText, {
      reply_markup: keyboard,
    });
  }
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
    `❌ *Failed*: ${statusCounts['failed'] || 0} tracks\n` +
    `⏳ *Queued*: ${statusCounts['queued'] || 0} tracks\n\n` +
    `📈 *Total*: ${total} tracks`;

  await ctx.answerCallbackQuery();
  await ctx.reply(message);
};
