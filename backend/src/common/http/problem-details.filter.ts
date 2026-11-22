import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: string[];
}

const PROBLEM_TYPE_BASE = 'https://veillo.local/errors';

const PROBLEM_TYPES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: `${PROBLEM_TYPE_BASE}/validation`,
  [HttpStatus.NOT_FOUND]: `${PROBLEM_TYPE_BASE}/not-found`,
  [HttpStatus.CONFLICT]: `${PROBLEM_TYPE_BASE}/conflict`,
  [HttpStatus.INTERNAL_SERVER_ERROR]: `${PROBLEM_TYPE_BASE}/internal-error`,
};

const DEFAULT_TITLES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Données invalides',
  [HttpStatus.NOT_FOUND]: 'Ressource introuvable',
  [HttpStatus.CONFLICT]: 'Conflit métier',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Erreur interne du serveur',
};

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let detail: string | undefined;
    let errors: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        detail = body;
        if (status === HttpStatus.BAD_REQUEST) {
          errors = [body];
        }
      } else if (typeof body === 'object' && body !== null) {
        const message = (body as { message?: unknown }).message;
        if (Array.isArray(message)) {
          const normalized = message.map(String);
          if (status === HttpStatus.BAD_REQUEST) {
            detail = 'La requête contient des données invalides.';
            errors = normalized;
          } else {
            detail = normalized.join('; ');
          }
        } else if (typeof message === 'string') {
          detail = message;
          if (status === HttpStatus.BAD_REQUEST) {
            errors = [message];
          }
        }
      }

      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(
          `Erreur HTTP ${status} sur ${request?.method ?? ''} ${request?.originalUrl ?? ''}`,
          exception.stack,
        );
        detail = 'Une erreur interne est survenue.';
        errors = undefined;
      }
    } else {
      const errorStack =
        exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(
        `Erreur interne non gérée sur ${request?.method ?? ''} ${request?.originalUrl ?? ''}`,
        errorStack,
      );
      detail = 'Une erreur interne est survenue.';
    }

    const problem: ProblemDetails = {
      type: PROBLEM_TYPES[status] ?? `${PROBLEM_TYPE_BASE}/http-${status}`,
      title: DEFAULT_TITLES[status] ?? 'Erreur HTTP',
      status,
      ...(detail ? { detail } : {}),
      ...(errors ? { errors } : {}),
      ...(request?.originalUrl ? { instance: request.originalUrl } : {}),
    };

    response.status(status).type('application/problem+json').json(problem);
  }
}
