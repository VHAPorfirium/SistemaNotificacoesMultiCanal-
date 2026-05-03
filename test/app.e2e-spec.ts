import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * Requer a stack do docker-compose rodando:
 * - Postgres em localhost:5432
 * - Redis em localhost:6379
 */
describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

  describe('POST /notifications', () => {
    it('rejeita body vazio com 400', () => {
      return request(app.getHttpServer())
        .post('/notifications')
        .send({})
        .expect(400);
    });

    it('rejeita channels com enum inválido', () => {
      return request(app.getHttpServer())
        .post('/notifications')
        .send({
          recipient: 'victor@example.com',
          content: 'oi',
          channels: ['CARRIER_PIGEON'],
        })
        .expect(400);
    });

    it('aceita payload válido e retorna 202 com id', async () => {
      const res = await request(app.getHttpServer())
        .post('/notifications')
        .send({
          recipient: 'victor@example.com',
          subject: 'e2e',
          content: 'teste e2e',
          channels: ['EMAIL'],
        })
        .expect(202);

      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body.status).toBe('PENDING');
      expect(res.body.logs).toHaveLength(1);
      expect(res.body.logs[0].channel).toBe('EMAIL');
    });
  });

  describe('GET /notifications/:id', () => {
    it('retorna 404 para UUID inexistente', () => {
      return request(app.getHttpServer())
        .get('/notifications/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('retorna 400 para id que não é UUID', () => {
      return request(app.getHttpServer())
        .get('/notifications/not-a-uuid')
        .expect(400);
    });
  });
});
