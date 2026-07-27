import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AppConfig } from '../../config/configuration';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-api-key'];
    const expected = this.config.get('auth.apiKey', { infer: true });

    if (!expected) {
      // Em ambiente sem API_KEY configurada, libera (dev local sem chave)
      return true;
    }

    if (!provided || Array.isArray(provided) || provided !== expected) {
      throw new UnauthorizedException('API key ausente ou inválida');
    }

    return true;
  }
}
