import {
  ChannelType,
  NotificationLogStatus,
  NotificationStatus,
  Priority,
  PrismaClient,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Seeding database...');

  // Limpa dados anteriores (apenas em dev)
  if (process.env.NODE_ENV !== 'production') {
    await prisma.notificationLog.deleteMany();
    await prisma.notification.deleteMany();
  }

  // 1) Notificação simples por email — completed
  const welcome = await prisma.notification.create({
    data: {
      recipient: 'victor@example.com',
      subject: 'Bem-vindo!',
      content: 'Sua conta foi criada com sucesso.',
      channels: [ChannelType.EMAIL],
      status: NotificationStatus.COMPLETED,
      priority: Priority.NORMAL,
      metadata: { source: 'seed', template: 'welcome' },
      logs: {
        create: {
          channel: ChannelType.EMAIL,
          status: NotificationLogStatus.SENT,
          attempts: 1,
          sentAt: new Date(),
          providerResponse: { messageId: 'seed-msg-001' },
        },
      },
    },
    include: { logs: true },
  });

  // 2) Notificação multi-canal — parcialmente falhou
  const multi = await prisma.notification.create({
    data: {
      recipient: 'victor@example.com',
      subject: 'Confirmação de pagamento',
      content: 'Recebemos seu pagamento de R$ 199,90.',
      channels: [ChannelType.EMAIL, ChannelType.SMS, ChannelType.PUSH],
      status: NotificationStatus.PARTIALLY_FAILED,
      priority: Priority.HIGH,
      metadata: { orderId: 'ORD-12345' },
      logs: {
        create: [
          {
            channel: ChannelType.EMAIL,
            status: NotificationLogStatus.SENT,
            attempts: 1,
            sentAt: new Date(),
          },
          {
            channel: ChannelType.SMS,
            status: NotificationLogStatus.FAILED,
            attempts: 3,
            errorMessage: 'Provider timeout after 3 retries',
          },
          {
            channel: ChannelType.PUSH,
            status: NotificationLogStatus.SENT,
            attempts: 1,
            sentAt: new Date(),
            providerResponse: { fcmId: 'seed-fcm-789' },
          },
        ],
      },
    },
    include: { logs: true },
  });

  // 3) Agendada — pendente
  const scheduled = await prisma.notification.create({
    data: {
      recipient: '+5511999999999',
      content: 'Lembrete: sua consulta é amanhã às 14h.',
      channels: [ChannelType.SMS],
      status: NotificationStatus.PENDING,
      priority: Priority.NORMAL,
      scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      metadata: { appointmentId: 'APT-9001' },
      logs: {
        create: {
          channel: ChannelType.SMS,
          status: NotificationLogStatus.PENDING,
          attempts: 0,
        },
      },
    },
    include: { logs: true },
  });

  console.log(`✅ Criadas ${[welcome, multi, scheduled].length} notificações`);
  console.log(`   - ${welcome.id} (welcome / EMAIL / COMPLETED)`);
  console.log(`   - ${multi.id} (multi-canal / PARTIALLY_FAILED)`);
  console.log(`   - ${scheduled.id} (agendada / PENDING)`);
}

main()
  .catch((err) => {
    console.error('❌ Seed falhou:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
