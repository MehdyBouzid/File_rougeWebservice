import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedCaller, CallerScope } from './caller.types';
import { REQUIRED_SCOPES_KEY } from './scopes.decorator';

const VALID_SCOPES = new Set<CallerScope>(['montre', 'patient', 'soignant']);

interface JwtLikeUser {
  sub?: string;
  id?: string;
  scope?: string;
  scopes?: string[];
  authorizedPatientIds?: string[];
  patientIds?: string[];
}

type AuthenticatedRequest = Request & {
  user?: JwtLikeUser;
  caller?: AuthenticatedCaller;
};

function parseScopes(raw: string | string[] | undefined): CallerScope[] {
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : raw.split(/[\s,]+/);
  return items
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is CallerScope =>
      VALID_SCOPES.has(item as CallerScope),
    );
}

function readHeader(request: Request, name: string): string | undefined {
  const value = request.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

/**
 * Guard d'authentification et de contrôle des scopes prêt pour OAuth 2.0 / JWT.
 *
 * - Si un middleware/strategy JWT a déjà renseigné `request.user`, ses claims sont utilisés.
 * - Sinon, en attendant le fournisseur OAuth, les en-têtes techniques
 *   `X-Caller-Scope` (+ `X-Caregiver-Id` ou `X-Caller-Id`, et optionnellement
 *   `X-Authorized-Patient-Ids`) permettent d'identifier l'appelant en dev/test.
 */
@Injectable()
export class CallerAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const caller = this.extractCaller(request);

    if (!caller) {
      throw new UnauthorizedException('Authentification absente ou invalide.');
    }

    const requiredScopes =
      this.reflector.getAllAndOverride<CallerScope[]>(REQUIRED_SCOPES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (
      requiredScopes.length > 0 &&
      !requiredScopes.some((scope) => caller.scopes.includes(scope))
    ) {
      throw new ForbiddenException(
        'Permissions insuffisantes pour cette opération.',
      );
    }

    request.caller = caller;
    return true;
  }

  private extractCaller(
    request: AuthenticatedRequest,
  ): AuthenticatedCaller | null {
    if (request.user) {
      const id = request.user.sub ?? request.user.id;
      const scopes = parseScopes(request.user.scopes ?? request.user.scope);
      if (!id || scopes.length === 0) {
        return null;
      }
      const authorizedPatientIds =
        request.user.authorizedPatientIds ?? request.user.patientIds;
      return {
        id,
        scopes,
        ...(authorizedPatientIds ? { authorizedPatientIds } : {}),
      };
    }

    const authHeader = readHeader(request, 'authorization');
    const rawScopes = readHeader(request, 'x-caller-scope');
    const callerId =
      readHeader(request, 'x-caregiver-id') ??
      readHeader(request, 'x-caller-id');

    if (authHeader && !/^Bearer\s+\S+$/i.test(authHeader)) {
      return null;
    }

    const scopes = parseScopes(rawScopes);
    if (scopes.length === 0) {
      return null;
    }

    if (scopes.includes('soignant') && !callerId) {
      return null;
    }

    const rawAuthorizedPatients = readHeader(
      request,
      'x-authorized-patient-ids',
    );
    const authorizedPatientIds = rawAuthorizedPatients
      ? rawAuthorizedPatients
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : undefined;

    return {
      id: callerId ?? 'simulator',
      scopes,
      ...(authorizedPatientIds ? { authorizedPatientIds } : {}),
    };
  }
}
