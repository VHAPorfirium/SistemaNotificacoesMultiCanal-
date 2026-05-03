import { ChannelType, Prisma } from '@prisma/client';

export interface ChannelDispatchPayload {
  recipient: string;
  subject?: string | null;
  content: string;
  metadata?: Prisma.JsonValue;
}

export interface ChannelDispatchResult {
  success: boolean;
  providerResponse?: Record<string, unknown>;
  errorMessage?: string;
}

export interface NotificationChannel {
  readonly type: ChannelType;
  send(payload: ChannelDispatchPayload): Promise<ChannelDispatchResult>;
}
