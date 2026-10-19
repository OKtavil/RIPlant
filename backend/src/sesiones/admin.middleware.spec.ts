import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AdminMiddleware } from './admin.middleware';
import type { RequestConSesion } from './sesion.interface';

describe('AdminMiddleware', () => {
  let middleware: AdminMiddleware;
  let next: jest.Mock;

  function req(sesion?: RequestConSesion['sesion']): RequestConSesion {
    return { sesion } as RequestConSesion;
  }

  beforeEach(() => {
    middleware = new AdminMiddleware();
    next = jest.fn();
  });

  it('should throw UnauthorizedException when there is no session', () => {
    expect(() => middleware.use(req(undefined), {} as never, next)).toThrow(
      UnauthorizedException,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException when the session is not an admin', () => {
    const sesion = {
      usuario: { id: 'u1', username: 'jardinero', rol: 'usuario' as const },
      expiraEn: new Date(),
    };

    expect(() => middleware.use(req(sesion), {} as never, next)).toThrow(
      ForbiddenException,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next when the session is an admin', () => {
    const sesion = {
      usuario: { id: 'u2', username: 'admin', rol: 'admin' as const },
      expiraEn: new Date(),
    };

    middleware.use(req(sesion), {} as never, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
