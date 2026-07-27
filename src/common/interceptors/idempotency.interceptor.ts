import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Request } from 'express';
import { Redis } from 'ioredis';
import { Observable, from, of, switchMap } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppConfig } from '../../config/configuration';
import { REDIS_CLIENT } from '../../redis/redis.constants';

const HEADER = 'idempotency-key';
const CACHE_PREFIX = 'idempotency:';

interface CachedResponse {
  fingerprint: string;
  body: unknown;
}

/**
 * Implementa o padrão Idempotency-Key (RFC draft-ietf-httpapi-idempotency-key).
 * Cliente envia `Idempotency-Key: <uuid>` no header. Se a mesma key voltar:
 *   - Com o MESMO body → devolve a resposta cacheada (200/202 com mesmo body)
 *   - Com body DIFERENTE → 409 Conflict (proteção contra reuso indevido)
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);
  private readonly ttl: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    config: ConfigService<AppConfig, true>,
  ) {
    this.ttl = config.get('idempotency.ttlSeconds', { infer: true });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawKey = request.headers[HEADER];

    if (!rawKey) {
      // Sem Idempotency-Key, segue normalmente
      return next.handle();
    }

    if (Array.isArray(rawKey) || rawKey.length > 255 || rawKey.length < 1) {
      throw new BadRequestException(
        'Idempotency-Key deve ser uma string entre 1 e 255 caracteres',
      );
    }

    const key = `${CACHE_PREFIX}${rawKey}`;
    const fingerprint = this.fingerprint(request);

    return from(this.redis.get(key)).pipe(
      switchMap((cached) => {
        if (cached) {
          const parsed = JSON.parse(cached) as CachedResponse;
          if (parsed.fingerprint !== fingerprint) {
            throw new ConflictException(
              'Idempotency-Key já usada com payload diferente',
            );
          }
          this.logger.debug(`Hit em ${rawKey}, devolvendo cache`);
          return of(parsed.body);
        }

        return next.handle().pipe(
          tap((body) => {
            const payload: CachedResponse = { fingerprint, body };
            void this.redis.set(key, JSON.stringify(payload), 'EX', this.ttl);
          }),
        );
      }),
    );
  }

  private fingerprint(request: Request): string {
    const hash = createHash('sha256');
    hash.update(request.method);
    hash.update(request.originalUrl ?? request.url);
    hash.update(JSON.stringify(request.body ?? {}));
    return hash.digest('hex');
  }
}
