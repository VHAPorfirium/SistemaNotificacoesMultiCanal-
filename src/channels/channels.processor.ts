import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import {
  ChannelType,
  NotificationLogStatus,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  DISPATCH_JOB,
  DispatchJobPayload,
} from '../notifications/notifications.service';
import { NOTIFICATIONS_QUEUE } from '../queue/queue.module';
import { NotificationChannel } from './channel.interface';
import { EmailChannel } from './email/email.channel';

@Processor(NOTIFICATIONS_QUEUE)
export class ChannelsProcessor extends WorkerHost {
  private readonly logger = new Logger(ChannelsProcessor.name);
  private readonly channels: Map<ChannelType, NotificationChannel>;

  constructor(
    private readonly prisma: PrismaService,
    emailChannel: EmailChannel,
  ) {
    super();
    this.channels = new Map<ChannelType, NotificationChannel>();
    this.channels.set(emailChannel.type, emailChannel);
    // Futuros: SMS, Push, Webhook
  }

  async process(job: Job<DispatchJobPayload>): Promise<{
    notificationId: string;
    success: number;
    failed: number;
  }> {
    if (job.name !== DISPATCH_JOB) {
      throw new Error(`Job desconhecido: ${job.name}`);
    }

    const { notificationId } = job.data;
    this.logger.log(`Processando notification ${notificationId}`);

    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: { logs: { where: { status: NotificationLogStatus.PENDING } } },
    });

    if (!notification) {
      throw new Error(`Notification ${notificationId} não existe`);
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: NotificationStatus.PROCESSING },
    });

    let success = 0;
    let failed = 0;

    for (const log of notification.logs) {
      const channel = this.channels.get(log.channel);

      if (!channel) {
        await this.markFailed(
          log.id,
          `Canal ${log.channel} ainda não implementado`,
        );
        failed++;
        continue;
      }

      const result = await channel.send({
        recipient: notification.recipient,
        subject: notification.subject,
        content: notification.content,
        metadata: notification.metadata,
      });

      if (result.success) {
        await this.prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            status: NotificationLogStatus.SENT,
            attempts: { increment: 1 },
            sentAt: new Date(),
            providerResponse: (result.providerResponse ??
              Prisma.JsonNull) as Prisma.InputJsonValue,
          },
        });
        success++;
      } else {
        await this.markFailed(
          log.id,
          result.errorMessage ?? 'Erro desconhecido',
        );
        failed++;
      }
    }

    const finalStatus =
      failed === 0
        ? NotificationStatus.COMPLETED
        : success === 0
          ? NotificationStatus.FAILED
          : NotificationStatus.PARTIALLY_FAILED;

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: finalStatus },
    });

    this.logger.log(
      `Notification ${notificationId} → ${finalStatus} (${success} ok, ${failed} fail)`,
    );

    return { notificationId, success, failed };
  }

  private async markFailed(logId: string, errorMessage: string) {
    await this.prisma.notificationLog.update({
      where: { id: logId },
      data: {
        status: NotificationLogStatus.FAILED,
        attempts: { increment: 1 },
        errorMessage,
      },
    });
  }
}
