import { Job } from 'bullmq';
import { PrismaClient } from '@musicai/database';
import type { NotifyPayload } from '@musicai/shared-types';
import { Bot } from 'grammy';
import { loadEnv } from '@musicai/config';

export class NotifyProcessor {
  private bot: Bot;

  constructor(private readonly prisma: PrismaClient) {
    this.bot = new Bot(loadEnv().BOT_TOKEN);
  }

  async process(job: Job<NotifyPayload>): Promise<void> {
    const { chatId, messageId, text, trackId, gcsUrl, errorCode } = job.data;

    if (messageId) {
      try {
        await this.bot.api.editMessageText(chatId, messageId, text);
      } catch (err) {
        console.error('Failed to edit message:', err);
      }
    } else {
      await this.bot.api.sendMessage(chatId, text);
    }

    if (trackId && gcsUrl) {
      const track = await this.prisma.track.findUnique({
        where: { id: trackId },
      });

      if (track) {
        await this.bot.api.sendAudio(chatId, gcsUrl, {
          title: track.revisedPrompt?.slice(0, 64) || 'MusicAI Track',
          performer: 'MusicAI Bot',
          duration: track.durationSec ?? undefined,
          caption: this.buildTrackCaption(track),
        });
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
