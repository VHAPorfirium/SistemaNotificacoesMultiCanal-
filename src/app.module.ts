import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChannelsModule } from './channels/channels.module';
import configuration from './config/configuration';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),
    PrismaModule,
    QueueModule,
    NotificationsModule,
    ChannelsModule,
  ],
})
export class AppModule {}
