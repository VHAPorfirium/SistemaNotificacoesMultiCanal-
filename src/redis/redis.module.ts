import { Global, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { Redis } from 'ioredis';
import { AppConfig } from '../config/configuration';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const redis = config.get('redis', { infer: true });
        const client = new Redis({
          host: redis.host,
          port: redis.port,
          password: redis.password,
          maxRetriesPerRequest: null, // necessário p/ uso compartilhado com workers
          lazyConnect: false,
        });

        const logger = new Logger('RedisClient');
        client.on('connect', () => logger.log('Redis conectado'));
        client.on('error', (err) =>
          logger.error(`Redis error: ${err.message}`),
        );

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(private readonly moduleRef: ModuleRef) {}

  async onApplicationShutdown(): Promise<void> {
    const client = this.moduleRef.get<Redis>(REDIS_CLIENT, { strict: false });
    if (client && client.status !== 'end') {
      await client.quit();
    }
  }
}
