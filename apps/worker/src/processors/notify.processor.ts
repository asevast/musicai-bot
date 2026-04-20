import { Job } from 'bullmq';
import { PrismaClient } from '@musicai/database';
import { storageService } from '@musicai/storage';
import type { NotifyPayload } from '@musicai/shared-types';
import { Bot, InlineKeyboard, InputFile } from 'grammy';
import { loadEnv } from '@musicai/config';

export class NotifyProcessor {
  private bot: Bot;

  constructor(private readonly prisma: PrismaClient) {
    this.bot = new Bot(loadEnv().BOT_TOKEN);
  }

  async process(job: Job<NotifyPayload>): Promise<void> {
    const { chatId, messageId, text, trackId, errorCode } = job.data;

    // Try to edit the status message first
    if (messageId) {
      try {
        await this.bot.api.editMessageText(chatId, messageId, text);
      } catch (err: any) {
        if (err?.description?.includes('message is not modified')) {
          console.log('[Notify] Message unchanged, skipping edit');
        } else if (err?.error_code === 404 || err?.description?.includes('message to edit not found')) {
          // Message was deleted or never existed - just log and continue
          console.log('[Notify] Message not found (404), continuing with notification');
        } else {
          console.error('[Notify] Failed to edit message:', err.message);
        }
      }
    }

    // Send the completed track with audio file
    if (trackId) {
      const track = (await this.prisma.track.findUnique({
        where: { id: trackId },
      })) as { id: string; type: string; prompt: string; gcsUrl?: string | null } | null;

      if (track && track.gcsUrl) {
        try {
          // Extract storage key from gcsUrl or construct it
          const storageKey = `tracks/${trackId}.mp3`;
          // Download from MinIO and send directly to Telegram
          const audioBuffer = await storageService.getFileBuffer(storageKey);

          // Send audio file directly to Telegram
          const webAppUrl = loadEnv().WEBAPP_URL || 'https://app.musicai.bot';
          await this.bot.api.sendAudio(
            chatId,
            new InputFile(audioBuffer, `${track.type}_track_${track.id.slice(0, 8)}.mp3`),
            {
              caption:
                `✅ Your track is ready!\n\n` +
                `🎵 ${track.type === 'instrumental' ? 'Instrumental' : 'Vocal'} track\n` +
                `📝 ${track.prompt.slice(0, 100)}${track.prompt.length > 100 ? '...' : ''}`,
              title: `MusicAI Track - ${track.id.slice(0, 8)}`,
              performer: 'MusicAI Bot',
              reply_markup: new InlineKeyboard().webApp(
                '🎵 Open in MusicAI',
                `${webAppUrl}/track/${trackId}`
              ),
            }
          );
          console.log('[Notify] Sent audio file directly to Telegram');
        } catch (err) {
          console.error('[Notify] Failed to send track:', err);
          // Fallback message
          await this.bot.api.sendMessage(
            chatId,
            `✅ Your track is ready!\n\nTrack ID: ${trackId}\n\nYou can access it in your history.`
          );
        }
      } else {
        console.error('[Notify] Track not found or no storageKey:', trackId);
      }
    }

    if (errorCode) {
      await this.bot.api.sendMessage(
        chatId,
        `❌ Track generation failed.\n\nError: ${errorCode}\n\nCredits have been refunded.`
      );
    }
  }

  private buildTrackCaption(track: any): string {
    return `🎵 ${track.type}\n\n${track.prompt.slice(0, 100)}...\n\nGenerated with MusicAI Bot`;
  }
}
