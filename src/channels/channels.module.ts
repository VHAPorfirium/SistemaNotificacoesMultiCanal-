import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NOTIFICATIONS_QUEUE } from '../queue/queue.module';
import { ChannelsProcessor } from './channels.processor';
import { EmailChannel } from './email/email.channel';

@Module({
  imports: [BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE })],
  providers: [EmailChannel, ChannelsProcessor],
  exports: [EmailChannel],
})
export class ChannelsModule {}
