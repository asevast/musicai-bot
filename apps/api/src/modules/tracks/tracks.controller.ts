import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { TracksService } from './tracks.service';
import type { CreateTrackDto } from '@musicai/shared-types';

@Controller('tracks')
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Post()
  create(@Body() dto: CreateTrackDto) {
    return this.tracksService.createTrack(dto.telegramId, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tracksService.getTrack(id);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.tracksService.getUserTracks(userId);
  }
}
