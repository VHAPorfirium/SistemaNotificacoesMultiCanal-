import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BullBoardModule } from './bull-board/bull-board.module';
import { ChannelsModule } from './channels/channels.module';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import configuration, { AppConfig } from './config/configuration';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const throttle = config.get('throttle', { infer: true });
        return [
          {
            name: 'default',
            ttl: throttle.ttl,
            limit: throttle.limit,
          },
        ];
      },
    }),

    PrismaModule,
    RedisModule,
    QueueModule,
    NotificationsModule,
    ChannelsModule,
    HealthModule,
    BullBoardModule,
  ],
  providers: [
    // Rate limiting global
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Auth global (rotas com @Public() ficam fora)
    { provide: APP_GUARD, useClass: ApiKeyGuard },
  ],
})
export class AppModule {}
