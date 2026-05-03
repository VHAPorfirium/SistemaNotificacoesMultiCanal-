import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChannelType } from '@prisma/client';
import { createTransport, Transporter } from 'nodemailer';
import { AppConfig } from '../../config/configuration';
import {
  ChannelDispatchPayload,
  ChannelDispatchResult,
  NotificationChannel,
} from '../channel.interface';

@Injectable()
export class EmailChannel implements NotificationChannel {
  readonly type = ChannelType.EMAIL;

  private readonly logger = new Logger(EmailChannel.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService<AppConfig, true>) {
    const smtp = config.get('smtp', { infer: true });
    this.from = smtp.from;
    this.transporter = createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth:
        smtp.user && smtp.password
          ? { user: smtp.user, pass: smtp.password }
          : undefined,
    });

    this.logger.log(
      `Email channel pronto (host=${smtp.host}:${smtp.port}, from=${this.from})`,
    );
  }

  async send(
    payload: ChannelDispatchPayload,
  ): Promise<ChannelDispatchResult> {
    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: payload.recipient,
        subject: payload.subject ?? '(sem assunto)',
        text: payload.content,
      });

      return {
        success: true,
        providerResponse: {
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Email para ${payload.recipient} falhou: ${message}`);
      return { success: false, errorMessage: message };
    }
  }
}
