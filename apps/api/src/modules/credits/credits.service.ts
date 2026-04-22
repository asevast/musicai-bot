import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@musicai/database';

export class InsufficientCreditsError extends Error {
  constructor(
    public current: number,
    public required: number
  ) {
    super(`Insufficient credits: ${current} < ${required}`);
    this.name = 'InsufficientCreditsError';
  }
}

@Injectable()
export class CreditsService {
  async getUserCredits(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.credits;
  }

  async addCredits(
    userId: string,
    amount: number,
    type: 'earn' | 'buy' | 'bonus' | 'refund',
    description: string,
    paymentId?: string,
    trackId?: string
  ): Promise<void> {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: amount } },
      }),
      prisma.creditTransaction.create({
        data: {
          userId,
          amount,
          type,
          description,
          paymentId,
          trackId,
        },
      }),
    ]);
  }

  async assertAndDeduct(userId: string, amount: number, description: string): Promise<void> {
    if (amount <= 0) {
      return;
    }

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

      if (user.credits < amount) {
        throw new InsufficientCreditsError(user.credits, amount);
      }

      await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: amount } },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -amount,
          type: 'spend',
          description,
        },
      });
    });
  }

  async getTransactionHistory(userId: string, limit = 20, offset = 0) {
    return prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async refund(userId: string, trackId: string): Promise<void> {
    const job = await prisma.synthJob.findFirst({
      where: { trackId },
      include: { track: true },
    });

    if (!job?.track.creditsCharged) return;

    const existingRefund = await prisma.creditTransaction.findFirst({
      where: {
        userId,
        trackId,
        type: 'refund',
      },
      select: { id: true },
    });

    if (existingRefund) return;

    await this.addCredits(
      userId,
      job.track.creditsCharged,
      'refund',
      `Refund for failed generation (${trackId.slice(0, 8)})`,
      undefined,
      trackId
    );
  }
}
