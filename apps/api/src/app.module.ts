import { Module } from '@nestjs/common';
import { TracksModule } from './modules/tracks/tracks.module';
import { UsersModule } from './modules/users/users.module';
import { CreditsModule } from './modules/credits/credits.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { ContentModule } from './modules/content/content.module';
import {
  GenerateRateLimitMiddleware,
  CommandRateLimitMiddleware,
} from './middleware/rate-limit.middleware';

@Module({
  imports: [
    TracksModule,
    UsersModule,
    CreditsModule,
    PaymentsModule,
    SubscriptionsModule,
    ContentModule,
  ],
  providers: [GenerateRateLimitMiddleware, CommandRateLimitMiddleware],
  exports: [GenerateRateLimitMiddleware, CommandRateLimitMiddleware],
})
export class AppModule {}
