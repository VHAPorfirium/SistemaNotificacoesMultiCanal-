import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';

export const NOTIFICATIONS_QUEUE = 'notifications';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const redis = config.get('redis', { infer: true });
        const bull = config.get('bull', { infer: true });
        return {
          connection: {
            host: redis.host,
            port: redis.port,
            password: redis.password || undefined,
          },
          prefix: bull.prefix,
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: { count: 1000, age: 60 * 60 * 24 },
            removeOnFail: { count: 5000 },
          },
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
