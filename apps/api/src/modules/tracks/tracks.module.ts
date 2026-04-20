import { Module } from '@nestjs/common';
import { CreditsModule } from '../credits/credits.module';
import { TracksController } from './tracks.controller';
import { TracksService } from './tracks.service';
import { TracksGateway } from './tracks.gateway';
import { loadEnv } from '@musicai/config';

const env = loadEnv();

@Module({
  imports: [CreditsModule],
  controllers: [TracksController],
  providers: [
    TracksService,
    TracksGateway,
    {
      provide: 'REDIS_URL',
      useValue: env.REDIS_URL,
    },
    {
      provide: 'BOT_TOKEN',
      useValue: env.BOT_TOKEN,
    },
  ],
  exports: [TracksService],
})
export class TracksModule {}
