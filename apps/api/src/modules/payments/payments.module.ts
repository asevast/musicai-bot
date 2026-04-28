import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsWebhookController } from './payments.webhook.controller';
import { CreditsModule } from '../credits/credits.module';
import { YuKassaService } from './yukassa.service';
import { StripeService } from './stripe.service';

@Module({
  imports: [CreditsModule],
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [PaymentsService, YuKassaService, StripeService],
  exports: [PaymentsService, YuKassaService, StripeService],
})
export class PaymentsModule {}
