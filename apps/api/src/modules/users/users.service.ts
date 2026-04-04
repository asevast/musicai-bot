import { Injectable } from '@nestjs/common';
import { prisma } from '@musicai/database';

@Injectable()
export class UsersService {
  async findByTelegramId(telegramId: bigint) {
    return prisma.user.findUnique({ where: { telegramId } });
  }

  async create(telegramId: bigint, data: { username?: string; firstName?: string }) {
    return prisma.user.create({
      data: {
        telegramId,
        username: data.username,
        firstName: data.firstName,
        credits: 10,
      },
    });
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const totalTracks = await prisma.track.count({ where: { userId } });

    return {
      ...user,
      totalTracks,
    };
  }
}
