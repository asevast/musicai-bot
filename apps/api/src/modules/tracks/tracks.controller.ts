import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { TracksService } from './tracks.service';
import type { CreateTrackDto } from '@musicai/shared-types';
import { TelegramAuthGuard } from '../../guards/telegram-auth.guard';

@Controller('tracks')
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Post()
  @UseGuards(TelegramAuthGuard)
  create(@Body() dto: CreateTrackDto) {
    return this.tracksService.createTrack(dto.telegramId, dto);
  }

  @Get('user/:userId')
  findByUser(
    @Param('userId') userId: string,
    @Query('limit') limit = '10',
    @Query('offset') offset = '0'
  ) {
    return this.tracksService.getUserTracks(userId, parseInt(limit, 10), parseInt(offset, 10));
  }

  @Get('public')
  getPublic(@Query('limit') limit = '20', @Query('offset') offset = '0') {
    return this.tracksService.getPublicTracks(parseInt(limit, 10), parseInt(offset, 10));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tracksService.getTrack(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'queued' | 'processing' | 'done' | 'failed' }
  ) {
    return this.tracksService.updateTrackStatus(id, body.status);
  }

  @Patch(':id/done')
  markDone(
    @Param('id') id: string,
    @Body() body: { gcsUrl: string; revisedPrompt?: string; durationSec?: number }
  ) {
    return this.tracksService.markTrackDone(id, body);
  }
}
