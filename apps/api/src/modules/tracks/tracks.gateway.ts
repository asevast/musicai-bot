import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  SubscribeMessage,
} from '@nestjs/websockets';
import { type Server, type Socket } from 'socket.io';
import { Inject } from '@nestjs/common';
import { validate, parse } from '@telegram-apps/init-data-node';
import { prisma } from '@musicai/database';
import type { TrackProgressEvent } from '@musicai/shared-types';
import IORedis from 'ioredis';

@WebSocketGateway({
  namespace: 'tracks',
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.WEBAPP_URL,
        'https://web.telegram.org',
        'https://*.telegram.org',
      ].filter(Boolean);
      if (
        !origin ||
        allowedOrigins.some((allowed) => origin.match(new RegExp(allowed.replace(/\*/g, '.*'))))
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
  },
})
export class TracksGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private redisSubscriber!: IORedis;

  constructor(
    @Inject('REDIS_URL')
    private readonly redisUrl: string,
    @Inject('BOT_TOKEN')
    private readonly botToken: string
  ) {
    this.redisSubscriber = new IORedis(this.redisUrl);
  }

  afterInit(): void {
    // Subscribe to Redis Pub/Sub channel for track progress updates
    this.redisSubscriber.subscribe('track:progress', (err) => {
      if (err) {
        console.error('[TracksGateway] Failed to subscribe to track:progress:', err);
        return;
      }
      console.log('[TracksGateway] Subscribed to track:progress channel');
    });

    this.redisSubscriber.on('message', (channel, message) => {
      if (channel === 'track:progress') {
        try {
          const event = JSON.parse(message) as TrackProgressEvent;
          this.notifyProgress(event.userId, event);
        } catch (error) {
          console.error('[TracksGateway] Failed to parse progress message:', error);
        }
      }
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    // Browser WebSocket cannot send custom headers; read initData from query param
    const initDataRaw = client.handshake.query.initData as string | undefined;

    if (!initDataRaw) {
      console.error('[TracksGateway] Missing initData query param');
      client.disconnect(true);
      return;
    }

    try {
      // Validate init data signature
      validate(initDataRaw, this.botToken);

      // Parse init data to extract user info
      const initData = parse(initDataRaw);
      const telegramId = initData.user?.id;

      if (!telegramId) {
        console.error('[TracksGateway] Invalid init data: user not found');
        client.disconnect(true);
        return;
      }

      // Verify user exists in database
      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
      });

      if (!user) {
        console.error('[TracksGateway] User not found:', telegramId);
        client.disconnect(true);
        return;
      }

      // Store user data on client
      client.data.telegramId = telegramId;
      client.data.userId = user.id;
    } catch (error) {
      console.error('[TracksGateway] Invalid init data:', error);
      client.disconnect(true);
    }
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(client: Socket, payload: { trackId: string }): Promise<void> {
    const { trackId } = payload;
    const telegramId = client.data.telegramId as number | undefined;

    if (!telegramId || !trackId) {
      client.emit('error', { message: 'Invalid subscription request' });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) },
      });

      if (!user) {
        client.emit('error', { message: 'User not found' });
        return;
      }

      // Verify track belongs to this user
      const track = await prisma.track.findFirst({
        where: { id: trackId, userId: user.id },
      });

      if (!track) {
        client.emit('error', { message: 'Track not found or access denied' });
        return;
      }

      // Store userId on client data
      client.data.userId = user.id;

      // Join room for this user
      client.join(`user:${user.id}`);
      client.emit('subscribed', { trackId, userId: user.id });
    } catch (error) {
      client.emit('error', { message: 'Internal server error' });
    }
  }

  notifyProgress(userId: string, payload: Omit<TrackProgressEvent, 'userId'>): void {
    this.server.to(`user:${userId}`).emit('track:progress', payload);
  }

  onModuleDestroy(): void {
    this.redisSubscriber.unsubscribe('track:progress');
    this.redisSubscriber.disconnect();
  }
}
