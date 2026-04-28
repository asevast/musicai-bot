import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ContentFilterService } from './content-filter.service';

interface CheckPromptDto {
  prompt: string;
}

@Controller('content')
export class ContentFilterController {
  constructor(private readonly filterService: ContentFilterService) {}

  @Post('check')
  async checkContent(@Body() dto: CheckPromptDto) {
    if (!dto.prompt || typeof dto.prompt !== 'string') {
      throw new BadRequestException('Prompt is required');
    }

    const result = await this.filterService.checkPrompt(dto.prompt);
    return result;
  }
}
