import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableShutdownHooks();

  // ----- OpenAPI / Swagger -----
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Notification Service')
    .setDescription(
      'API multi-canal para envio assíncrono de notificações. ' +
        'Use o header `x-api-key` para autenticar e `Idempotency-Key` em POSTs.',
    )
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .addTag('notifications', 'Criar e consultar notificações')
    .addTag('health', 'Liveness/readiness')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Notification service rodando em http://localhost:${port}`);
  logger.log(`📖 Swagger UI em       http://localhost:${port}/api/docs`);
  logger.log(`📊 Bull Board em       http://localhost:${port}/admin/queues`);
  logger.log(`❤️  Health em           http://localhost:${port}/health`);
}

void bootstrap();
