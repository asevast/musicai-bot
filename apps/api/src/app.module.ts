import { Module } from '@nestjs/common';
import { TracksModule } from './modules/tracks/tracks.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [TracksModule, UsersModule],
})
export class AppModule {}
