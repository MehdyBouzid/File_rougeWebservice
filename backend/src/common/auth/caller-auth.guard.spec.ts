import {
  type ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CallerAuthGuard } from './caller-auth.guard';
import type { CallerScope } from './caller.types';

function createContext(
  request: Record<string, unknown>,
  requiredScopes: CallerScope[] = [],
): { context: ExecutionContext; reflector: Reflector } {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(requiredScopes),
  } as unknown as Reflector;

  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;

  return { context, reflector };
}

describe('CallerAuthGuard', () => {
  it('renvoie 401 si aucune authentification n’est fournie', () => {
    const request: Record<string, unknown> = { headers: {} };
    const { context, reflector } = createContext(request, ['soignant']);
    const guard = new CallerAuthGuard(reflector);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('renvoie 401 si un en-tête Authorization est mal formé', () => {
    const request: Record<string, unknown> = {
      headers: {
        authorization: 'Basic abc',
        'x-caller-scope': 'montre',
      },
    };
    const { context, reflector } = createContext(request, ['montre']);
    const guard = new CallerAuthGuard(reflector);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('renvoie 401 pour un soignant sans identifiant', () => {
    const request: Record<string, unknown> = {
      headers: {
        'x-caller-scope': 'soignant',
      },
    };
    const { context, reflector } = createContext(request, ['soignant']);
    const guard = new CallerAuthGuard(reflector);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('renvoie 403 si le scope ne couvre pas la route demandée (BFLA)', () => {
    const request: Record<string, unknown> = {
      headers: {
        'x-caller-scope': 'montre',
      },
    };
    const { context, reflector } = createContext(request, ['soignant']);
    const guard = new CallerAuthGuard(reflector);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('autorise un appelant issu de request.user (JWT) avec le bon scope', () => {
    const request: Record<string, unknown> = {
      headers: {},
      user: {
        sub: '11111111-1111-4111-8111-111111111111',
        scope: 'soignant',
      },
    };
    const { context, reflector } = createContext(request, ['soignant']);
    const guard = new CallerAuthGuard(reflector);

    expect(guard.canActivate(context)).toBe(true);
    expect(request.caller).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      scopes: ['soignant'],
    });
  });

  it('autorise un client montre avec X-Authorized-Patient-Ids', () => {
    const request: Record<string, unknown> = {
      headers: {
        authorization: 'Bearer token-demo',
        'x-caller-scope': 'montre',
        'x-authorized-patient-ids':
          '22222222-2222-4222-8222-222222222222, 33333333-3333-4333-8333-333333333333',
      },
    };
    const { context, reflector } = createContext(request, ['montre']);
    const guard = new CallerAuthGuard(reflector);

    expect(guard.canActivate(context)).toBe(true);
    expect(request.caller).toEqual({
      id: 'simulator',
      scopes: ['montre'],
      authorizedPatientIds: [
        '22222222-2222-4222-8222-222222222222',
        '33333333-3333-4333-8333-333333333333',
      ],
    });
  });
});
