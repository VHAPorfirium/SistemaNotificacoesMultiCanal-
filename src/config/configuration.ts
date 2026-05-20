/**
 * Centraliza a leitura de variáveis de ambiente.
 * Use via ConfigService<AppConfig, true> nos módulos.
 */
export interface AppConfig {
  app: {
    nodeEnv: 'development' | 'test' | 'production';
    port: number;
    logLevel: string;
  };
  database: {
    url: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  bull: {
    prefix: string;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    password?: string;
    from: string;
  };
  auth: {
    apiKey: string;
    jwtSecret: string;
    webhookSigningSecret: string;
  };
}

export default (): AppConfig => ({
  app: {
    nodeEnv:
      (process.env.NODE_ENV as AppConfig['app']['nodeEnv']) ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    logLevel: process.env.LOG_LEVEL ?? 'info',
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  bull: {
    prefix: process.env.BULL_PREFIX ?? 'bull',
  },
  smtp: {
    host: process.env.SMTP_HOST ?? 'localhost',
    port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || undefined,
    password: process.env.SMTP_PASSWORD || undefined,
    from: process.env.SMTP_FROM ?? 'noreply@localhost',
  },
  auth: {
    apiKey: process.env.API_KEY ?? '',
    jwtSecret: process.env.JWT_SECRET ?? '',
    webhookSigningSecret: process.env.WEBHOOK_SIGNING_SECRET ?? '',
  },
});
