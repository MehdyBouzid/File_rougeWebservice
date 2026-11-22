import {
  type ArgumentsHost,
  BadRequestException,
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ProblemDetailsFilter } from './problem-details.filter';

describe('ProblemDetailsFilter', () => {
  function createHost(url = '/alerts', method = 'GET') {
    const response = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ originalUrl: url, method }),
      }),
    } as unknown as ArgumentsHost;
    return { host, response };
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renvoie 400 avec le champ errors et une URI type stable pour la validation', () => {
    const filter = new ProblemDetailsFilter();
    const { host, response } = createHost('/measurements', 'POST');

    filter.catch(
      new BadRequestException({
        message: ['property inconnu should not exist'],
        error: 'Bad Request',
        statusCode: 400,
      }),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.type).toHaveBeenCalledWith('application/problem+json');
    expect(response.json).toHaveBeenCalledWith({
      type: 'https://veillo.local/errors/validation',
      title: 'Données invalides',
      status: 400,
      detail: 'La requête contient des données invalides.',
      errors: ['property inconnu should not exist'],
      instance: '/measurements',
    });
  });

  it('ajoute WWW-Authenticate: Bearer et une URI type stable sur 401', () => {
    const filter = new ProblemDetailsFilter();
    const { host, response } = createHost('/alerts');

    filter.catch(new UnauthorizedException('Jeton absent.'), host);

    expect(response.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'Bearer',
    );
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.type).toHaveBeenCalledWith('application/problem+json');
    expect(response.json).toHaveBeenCalledWith({
      type: 'https://veillo.local/errors/unauthorized',
      title: 'Authentification invalide',
      status: 401,
      detail: 'Jeton absent.',
      instance: '/alerts',
    });
  });

  it('formate un conflit 409 en RFC 9457 avec une URI type dédiée', () => {
    const filter = new ProblemDetailsFilter();
    const { host, response } = createHost('/measurements', 'POST');

    filter.catch(new ConflictException('Lot déjà enregistré.'), host);

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.type).toHaveBeenCalledWith('application/problem+json');
    expect(response.json).toHaveBeenCalledWith({
      type: 'https://veillo.local/errors/conflict',
      title: 'Conflit métier',
      status: 409,
      detail: 'Lot déjà enregistré.',
      instance: '/measurements',
    });
  });

  it('masque la trace dans la réponse 500 mais la consigne dans les logs', () => {
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const filter = new ProblemDetailsFilter();
    const { host, response } = createHost('/measurements', 'POST');
    const internalError = new Error('SQL syntax error near secret');

    filter.catch(internalError, host);

    expect(loggerSpy).toHaveBeenCalledWith(
      'Erreur interne non gérée sur POST /measurements',
      internalError.stack,
    );
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      type: 'https://veillo.local/errors/internal-error',
      title: 'Erreur interne du serveur',
      status: 500,
      detail: 'Une erreur interne est survenue.',
      instance: '/measurements',
    });
  });
});
