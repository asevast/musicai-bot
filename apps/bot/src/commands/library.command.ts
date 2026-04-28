import { Context, InlineKeyboard } from 'grammy';
import { prisma } from '@musicai/database';
import { storageService } from '@musicai/storage';

const TRACKS_PER_PAGE = 5;

interface LibraryPageResult {
  tracks: Array<{
    id: string;
    prompt: string;
    type: string;
    gcsUrl: string | null;
    user: { username: string | null; firstName: string | null };
    createdAt: Date;
  }>;
  total: number;
  hasMore: boolean;
}

/**
 * Get paginated public tracks
 * SPEC §6.1: Paginated library with audio playback
 */
async function getLibraryPage(page: number): Promise<LibraryPageResult> {
  const skip = (page - 1) * TRACKS_PER_PAGE;

  const [tracks, total] = await Promise.all([
    prisma.track.findMany({
      where: { isPublic: true, status: 'done', gcsUrl: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: TRACKS_PER_PAGE,
      skip,
      include: {
        user: {
          select: { username: true, firstName: true },
        },
      },
    }),
    prisma.track.count({
      where: { isPublic: true, status: 'done', gcsUrl: { not: null } },
    }),
  ]);

  return {
    tracks,
    total,
    hasMore: skip + tracks.length < total,
  };
}

/**
 * Build library message text
 */
function buildLibraryMessage(result: LibraryPageResult, page: number): string {
  let message = '📚 *Community Library*\n\n';

  if (result.tracks.length === 0) {
    message += 'No public tracks yet. Be the first to share your creation!\n\nUse /create to generate a track and add it to the library.';
    return message;
  }

  const totalPages = Math.ceil(result.total / TRACKS_PER_PAGE);
  message += `Page ${page}/${totalPages} • ${result.total} tracks total\n\n`;

  result.tracks.forEach((track, idx) => {
    const displayName = track.user.username || track.user.firstName || 'Anonymous';
    const number = (page - 1) * TRACKS_PER_PAGE + idx + 1;
    message += `${number}. ${track.type === 'instrumental' ? '🎹' : '🎵'} ${displayName}\n`;
    message += `   _${track.prompt.slice(0, 40)}…_\n`;
    message += `\n`;
  });

  return message;
}

/**
 * Build library keyboard with pagination
 */
function buildLibraryKeyboard(
  page: number,
  result: LibraryPageResult
): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  // Add play buttons for each track
  result.tracks.forEach((track, idx) => {
    const number = (page - 1) * TRACKS_PER_PAGE + idx + 1;
    keyboard.text(`▶️ ${number}`, `lib_play_${track.id}`);
    if (idx % 2 === 1) keyboard.row();
  });

  // Add pagination row if needed
  const paginationRow = [];
  if (page > 1) {
    paginationRow.push({ text: '⬅️ Prev', callback_data: `lib_page_${page - 1}` });
  }
  if (result.hasMore) {
    paginationRow.push({ text: 'Next ➡️', callback_data: `lib_page_${page + 1}` });
  }

  if (paginationRow.length > 0) {
    if (result.tracks.length % 2 === 1) keyboard.row();
    paginationRow.forEach((btn) => keyboard.text(btn.text, btn.callback_data));
    keyboard.row();
  }

  keyboard.text('⬅️ Back to Menu', 'main_menu');

  return keyboard;
}

/**
 * Show library page
 * SPEC §6.1: Paginated library with audio playback
 */
export async function showLibraryPage(
  ctx: Context,
  page: number
): Promise<void> {
  const result = await getLibraryPage(page);

  const message = buildLibraryMessage(result, page);
  const keyboard = buildLibraryKeyboard(page, result);

  // Check if this is a callback query or new command
  if (ctx.callbackQuery) {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
    await ctx.answerCallbackQuery();
  } else {
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }
}

/**
 * Handle library page navigation
 */
export async function handleLibraryPage(ctx: Context): Promise<void> {
  const pageData = ctx.callbackQuery?.data;
  if (!pageData?.startsWith('lib_page_')) return;

  const page = parseInt(pageData.replace('lib_page_', ''), 10);
  if (isNaN(page) || page < 1) return;

  await showLibraryPage(ctx, page);
}

/**
 * Handle play track from library
 * SPEC §6.1: Audio playback from library
 */
export async function handleLibraryPlay(ctx: Context): Promise<void> {
  const trackId = ctx.callbackQuery?.data?.replace('lib_play_', '');
  if (!trackId) return;

  await ctx.answerCallbackQuery('🎵 Loading track...');

  try {
    const track = await prisma.track.findFirst({
      where: { id: trackId, isPublic: true, status: 'done' },
      include: {
        user: { select: { username: true, firstName: true } },
      },
    });

    if (!track?.gcsUrl) {
      await ctx.reply('❌ Track not found or not available');
      return;
    }

    // Extract storage key from gcsUrl
    const gcsUrlObj = new URL(track.gcsUrl);
    const pathParts = gcsUrlObj.pathname.split('/').filter(Boolean);
    const storageKey = pathParts.slice(1).join('/');

    // Get audio buffer
    const audioBuffer = await storageService.getFileBuffer(storageKey);

    const displayName = track.user?.username || track.user?.firstName || 'Anonymous';
    const trackType = track.type === 'instrumental' ? '🎹 Instrumental' : '🎵 Vocal';

    // Send as voice message for inline playback
    await ctx.replyWithVoice(audioBuffer, {
      caption: `${trackType} by ${displayName}\n📝 ${track.prompt.slice(0, 100)}${track.prompt.length > 100 ? '...' : ''}`,
    });
  } catch (error) {
    console.error('[Library] Failed to play track:', error);
    await ctx.reply('❌ Failed to load track. Please try again.');
  }
}

/**
 * Legacy library command - redirects to paginated version
 */
export const libraryCommand = async (ctx: Context) => {
  await showLibraryPage(ctx, 1);
};

/**
 * Setup library handlers
 * Call this in bot.ts to register handlers
 */
export function setupLibraryHandlers(bot: any): void {
  // Page navigation
  bot.callbackQuery(/^lib_page_\d+$/, handleLibraryPage);

  // Play track
  bot.callbackQuery(/^lib_play_/, handleLibraryPlay);
}
