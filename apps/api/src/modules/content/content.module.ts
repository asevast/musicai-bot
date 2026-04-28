import { Module } from '@nestjs/common';
import { ContentFilterService } from './content-filter.service';
import { ContentFilterController } from './content-filter.controller';

@Module({
  providers: [ContentFilterService],
  controllers: [ContentFilterController],
  exports: [ContentFilterService],
})
export class ContentModule {}
