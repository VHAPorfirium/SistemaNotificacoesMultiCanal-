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
  /** Email, telefone (E.164) ou deviceId — depende do canal */
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  recipient!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(ChannelType, { each: true })
  channels!: ChannelType[];

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  /** ISO 8601. Se preenchido, a notificação é enfileirada com delay. */
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
