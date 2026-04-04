import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('telegram/:telegramId')
  findByTelegramId(@Param('telegramId') telegramId: string) {
    return this.usersService.findByTelegramId(BigInt(telegramId));
  }

  @Get(':id/profile')
  getProfile(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }
}
