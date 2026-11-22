import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedCaller, CallerScope } from './caller.types';

export const REQUIRED_SCOPES_KEY = 'required_scopes';

export const RequireScopes = (...scopes: CallerScope[]) =>
  SetMetadata(REQUIRED_SCOPES_KEY, scopes);

export const CurrentCaller = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedCaller => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { caller?: AuthenticatedCaller }>();
    return request.caller!;
  },
);
