import { Context } from 'grammy';
import { prisma } from '@musicai/database';
import { storageService } from '@musicai/storage';

export const handleInlineQuery = async (ctx: Context) => {
  const query = ctx.inlineQuery.query;
  const userId = ctx.inlineQuery.from.id.toString();

  let tracks;
  if (query.trim()) {
    const searchTerms = query.split(' ').filter((t) => t.length > 0);
    tracks = await prisma.track.findMany({
      where: {
        userId,
        status: 'done',
        prompt: {
          contains: searchTerms[0],
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  } else {
    tracks = await prisma.track.findMany({
      where: { userId, status: 'done' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  if (tracks.length === 0) {
    return ctx.answerInlineQuery([
      {
        type: 'article',
        id: 'no_tracks',
        title: 'No tracks found',
        description: 'Create a track with /create to share it!',
        input_message_content: {
          message_text: '🎵 No tracks found. Use /create to generate music!',
        },
      },
    ]);
  }

  const results = await Promise.all(
    tracks.map(async (track) => {
      const preview = track.prompt.slice(0, 50) + (track.prompt.length > 50 ? '...' : '');
      const typeEmoji = track.type === 'clip' ? '✂️' : track.type === 'instrumental' ? '🎹' : '🎵';

      let audioUrl: string | undefined;
      let thumbUrl: string | undefined;

      if (track.gcsUrl) {
        try {
          const storageKey = track.gcsUrl.split('/').slice(-2).join('/');
          const publicUrl = storageService.getPublicUrl(storageKey);
          audioUrl = publicUrl;
        } catch {
          // Ignore storage errors
        }
      }

      const shareText =
        `🎵 Track: ${preview}\n` +
        `Type: ${track.type}\n` +
        `Created with @fleshmus_bot`;

      return {
        type: 'audio' as const,
        id: track.id,
        audio_url: audioUrl || '',
        title: preview,
        performer: `@fleshmus_bot`,
        caption: shareText,
        parse_mode: 'HTML',
      };
    })
  );

  await ctx.answerInlineQuery(results, {
    cache_time: 60,
    is_personal: true,
  });
};
