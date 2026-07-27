import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiSecurity('api-key')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({
    summary: 'Cria uma notificação multi-canal',
    description:
      'Persiste a notificação + um log por canal e enfileira o job. ' +
      'Use o header `Idempotency-Key` para evitar duplicação em retries do cliente.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    description:
      'UUID v4 (recomendado). Mesmo body com a mesma key devolve cache; body diferente retorna 409.',
    required: false,
  })
  @ApiResponse({ status: 202, description: 'Aceita, processamento assíncrono' })
  @ApiResponse({ status: 400, description: 'Payload inválido' })
  @ApiResponse({
    status: 409,
    description: 'Idempotency-Key reutilizada com body diferente',
  })
  @ApiResponse({ status: 429, description: 'Rate limit excedido' })
  create(@Body() dto: CreateNotificationDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista notificações paginadas' })
  list(@Query() query: ListNotificationsDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca uma notificação pelo ID com seus logs' })
  @ApiResponse({ status: 200, description: 'Encontrada' })
  @ApiResponse({ status: 404, description: 'Não encontrada' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }
}
