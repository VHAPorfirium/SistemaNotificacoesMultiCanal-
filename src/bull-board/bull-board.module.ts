import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule as BullBoardCore } from '@bull-board/nestjs';
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import basicAuth from 'express-basic-auth';
import { AppConfig } from '../config/configuration';
import { NOTIFICATIONS_QUEUE } from '../queue/queue.module';

const BULL_BOARD_PATH = '/admin/queues';

@Module({
  imports: [
    BullBoardCore.forRoot({
      route: BULL_BOARD_PATH,
      adapter: ExpressAdapter,
    }),
    BullBoardCore.forFeature({
      name: NOTIFICATIONS_QUEUE,
      adapter: BullMQAdapter,
    }),
  ],
})
export class BullBoardModule implements NestModule {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  configure(consumer: MiddlewareConsumer): void {
    const { username, password } = this.config.get('bullBoard', {
      infer: true,
    });

    consumer
      .apply(
        basicAuth({
          users: { [username]: password },
          challenge: true,
          realm: 'BullBoard',
        }),
      )
      .forRoutes({ path: 'admin/queues*', method: RequestMethod.ALL });
  }
}
