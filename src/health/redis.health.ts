import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.redis.ping();
      const isHealthy = pong === 'PONG';
      const result = this.getStatus(key, isHealthy, {
        status: this.redis.status,
      });

      if (isHealthy) return result;
      throw new HealthCheckError('Redis não respondeu PONG', result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'desconhecido';
      throw new HealthCheckError(
        `Redis check falhou: ${message}`,
        this.getStatus(key, false, { error: message }),
      );
    }
  }
}
