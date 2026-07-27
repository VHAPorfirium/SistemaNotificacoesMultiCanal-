import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca uma rota como pública (sem ApiKeyGuard).
 * Use em /health, /api/docs, etc.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
