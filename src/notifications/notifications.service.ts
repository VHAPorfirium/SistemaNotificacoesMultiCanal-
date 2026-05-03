import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  NotificationLogStatus,
  NotificationStatus,
  Prisma,
  Priority,
} from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATIONS_QUEUE } from '../queue/queue.module';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ListNotificationsDto } from './dto/list-notifications.dto';

export const DISPATCH_JOB = 'dispatch';

export interface DispatchJobPayload {
  notificationId: string;
}

const PRIORITY_TO_INT: Record<Priority, number> = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
  ) {}

  async create(dto: CreateNotificationDto) {
    const priority = dto.priority ?? Priority.NORMAL;
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;

    const notification = await this.prisma.notification.create({
      data: {
        recipient: dto.recipient,
        subject: dto.subject,
        content: dto.content,
        channels: dto.channels,
        priority,
        scheduledAt,
        metadata: (dto.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        logs: {
          create: dto.channels.map((channel) => ({
            channel,
            status: NotificationLogStatus.PENDING,
          })),
        },
      },
      include: { logs: true },
    });

    const delayMs = scheduledAt
      ? Math.max(0, scheduledAt.getTime() - Date.now())
      : 0;

    try {
      await this.queue.add(
        DISPATCH_JOB,
        { notificationId: notification.id } satisfies DispatchJobPayload,
        {
          delay: delayMs > 0 ? delayMs : undefined,
          priority: PRIORITY_TO_INT[priority],
          jobId: notification.id,
        },
      );
    } catch (err) {
      this.logger.error(
        `Falha ao enfileirar notification ${notification.id}: ${(err as Error).message}`,
      );
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.FAILED },
      });
      throw err;
    }

    return notification;
  }

  async findOne(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: { logs: { orderBy: { createdAt: 'asc' } } },
    });
    if (!notification) {
      throw new NotFoundException(`Notification ${id} não encontrada`);
    }
    return notification;
  }

  async list(query: ListNotificationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.NotificationWhereInput = query.status
      ? { status: query.status }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { logs: true },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
