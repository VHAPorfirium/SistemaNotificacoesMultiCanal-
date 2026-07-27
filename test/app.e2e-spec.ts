import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * Requer a stack do docker-compose rodando:
 * - Postgres em localhost:5432
 * - Redis em localhost:6379
 */
interface NotificationResponseBody {
  id: string;
  status: string;
  logs: { channel: string }[];
}

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let apiKey: string;

  /** Helper p/ enviar a API key se ela estiver configurada. */
  const authed = (req: request.Test) =>
    apiKey ? req.set('x-api-key', apiKey) : req;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    apiKey =
      moduleFixture
        .get(ConfigService)
        .get<string>('auth.apiKey', { infer: true } as never) ?? '';

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('retorna ok sem precisar de API key', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.info).toHaveProperty('database');
      expect(res.body.info).toHaveProperty('redis');
    });
  });

  describe('Auth', () => {
    it('rejeita POST sem API key quando configurada', async () => {
      if (!apiKey) return; // skip em CI sem API_KEY
      await request(app.getHttpServer())
        .post('/notifications')
        .send({
          recipient: 'victor@example.com',
          content: 'sem auth',
          channels: ['EMAIL'],
        })
        .expect(401);
    });
  });

  describe('POST /notifications', () => {
    it('rejeita body vazio com 400', () => {
      return authed(request(app.getHttpServer()).post('/notifications'))
        .send({})
        .expect(400);
    });

    it('rejeita channels com enum inválido', () => {
      return authed(request(app.getHttpServer()).post('/notifications'))
        .send({
          recipient: 'victor@example.com',
          content: 'oi',
          channels: ['CARRIER_PIGEON'],
        })
        .expect(400);
    });

    it('aceita payload válido e retorna 202 com id', async () => {
      const res = await authed(
        request(app.getHttpServer()).post('/notifications'),
      )
        .send({
          recipient: 'victor@example.com',
          subject: 'e2e',
          content: 'teste e2e',
          channels: ['EMAIL'],
        })
        .expect(202);

      const body = res.body as NotificationResponseBody;
      expect(body.id).toEqual(expect.any(String));
      expect(body.status).toBe('PENDING');
      expect(body.logs).toHaveLength(1);
      expect(body.logs[0].channel).toBe('EMAIL');
    });

    it('Idempotency-Key: mesma key + mesmo body devolve cache', async () => {
      const key = `e2e-${Date.now()}`;
      const payload = {
        recipient: 'victor@example.com',
        content: 'idempotent',
        channels: ['EMAIL'],
      };

      const r1 = await authed(
        request(app.getHttpServer()).post('/notifications'),
      )
        .set('Idempotency-Key', key)
        .send(payload)
        .expect(202);

      const r2 = await authed(
        request(app.getHttpServer()).post('/notifications'),
      )
        .set('Idempotency-Key', key)
        .send(payload)
        .expect(202);

      expect(r1.body.id).toBe(r2.body.id);
    });

    it('Idempotency-Key: mesma key + body diferente retorna 409', async () => {
      const key = `e2e-conflict-${Date.now()}`;

      await authed(request(app.getHttpServer()).post('/notifications'))
        .set('Idempotency-Key', key)
        .send({
          recipient: 'victor@example.com',
          content: 'original',
          channels: ['EMAIL'],
        })
        .expect(202);

      await authed(request(app.getHttpServer()).post('/notifications'))
        .set('Idempotency-Key', key)
        .send({
          recipient: 'outro@example.com',
          content: 'diferente',
          channels: ['EMAIL'],
        })
        .expect(409);
    });
  });

  describe('GET /notifications/:id', () => {
    it('retorna 404 para UUID inexistente', () => {
      return authed(
        request(app.getHttpServer()).get(
          '/notifications/00000000-0000-0000-0000-000000000000',
        ),
      ).expect(404);
    });

    it('retorna 400 para id que não é UUID', () => {
      return authed(
        request(app.getHttpServer()).get('/notifications/not-a-uuid'),
      ).expect(400);
    });
  });
});
