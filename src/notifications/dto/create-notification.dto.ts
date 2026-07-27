import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelType, Priority } from '@prisma/client';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({
    description:
      'Email, telefone (E.164) ou deviceId — depende do canal escolhido',
    example: 'victor@example.com',
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  recipient!: string;

  @ApiPropertyOptional({
    description: 'Assunto do email (ignorado em canais sem assunto)',
    example: 'Confirmação de pagamento',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;

  @ApiProperty({
    description: 'Conteúdo da mensagem',
    example: 'Recebemos seu pagamento de R$ 199,90.',
  })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiProperty({
    description: 'Lista de canais por onde disparar',
    enum: ChannelType,
    isArray: true,
    example: ['EMAIL', 'SMS'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(ChannelType, { each: true })
  channels!: ChannelType[];

  @ApiPropertyOptional({
    description: 'Define ordem de processamento na fila',
    enum: Priority,
    default: Priority.NORMAL,
  })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({
    description:
      'ISO 8601. Se preenchido, a notificação é enfileirada com delay.',
    example: '2026-05-10T20:00:00Z',
  })
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description:
      'Metadata livre (orderId, traceId, etc.). Persistido como JSON.',
    example: { orderId: 'ORD-12345', traceId: 'abc123' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
