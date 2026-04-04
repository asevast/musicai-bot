import { Module } from '@nestjs/common';
import { TracksModule } from './modules/tracks/tracks.module';
import { UsersModule } from './modules/users/users.module';
import { CreditsModule } from './modules/credits/credits.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [TracksModule, UsersModule, CreditsModule, PaymentsModule],
})
export class AppModule {}
EOF