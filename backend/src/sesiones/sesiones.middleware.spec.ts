import { SesionesMiddleware } from './sesiones.middleware';
import type { SesionesService } from './sesiones.service';
import type { RequestConSesion } from './sesion.interface';

describe('SesionesMiddleware', () => {
  let middleware: SesionesMiddleware;
  let sesiones: { resolver: jest.Mock };
  let next: jest.Mock;

  beforeEach(() => {
    sesiones = { resolver: jest.fn().mockResolvedValue(null) };
    middleware = new SesionesMiddleware(
      sesiones as unknown as SesionesService,
    );
    next = jest.fn();
  });

  function req(cookie?: string): RequestConSesion {
    return { headers: { cookie } } as unknown as RequestConSesion;
  }

  it('should attach req.sesion when the cookie resolves a session', async () => {
    const sesion = {
      usuario: { id: 'u1', username: 'admin', rol: 'admin' as const },
      expiraEn: new Date(),
    };
    sesiones.resolver.mockResolvedValue(sesion);
    const request = req('riplanta_sesion=abc123; otra=1');

    await middleware.use(request, {} as never, next);

    expect(sesiones.resolver).toHaveBeenCalledWith('abc123');
    expect(request.sesion).toEqual(sesion);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should leave req.sesion undefined when there is no cookie', async () => {
    const request = req(undefined);

    await middleware.use(request, {} as never, next);

    expect(sesiones.resolver).toHaveBeenCalledWith(undefined);
    expect(request.sesion).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should leave req.sesion undefined for an unknown token', async () => {
    const request = req('riplanta_sesion=desconocido');

    await middleware.use(request, {} as never, next);

    expect(request.sesion).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should not break the request when the cookie has invalid percent-encoding', async () => {
    // `%E0%A4%A` no es una secuencia UTF-8 válida, así que decodeURIComponent
    // lanza URIError. Sin protección el error sale del middleware y cualquier
    // request que traiga la cookie rota responde 500.
    const request = req('riplanta_sesion=%E0%A4%A; otra=1');

    await middleware.use(request, {} as never, next);

    expect(sesiones.resolver).toHaveBeenCalledWith(undefined);
    expect(request.sesion).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should degrade to no session when the resolver throws (R4-AUTH-OBSERVABILITY-GAP)', async () => {
    // `SesionesMiddleware` es GLOBAL (`forRoutes('*')`). Si la base se cae, el
    // `resolver` lanza y, sin protección, la excepción sube: TODA la app
    // responde 500 — incluidas las rutas públicas (`GET /lapidas`,
    // `GET /categorias`), que no necesitan base para responder. La sesión es
    // autenticación: que no se pueda resolver no es motivo para tumbar el
    // request. Se degrada a "sin sesión" (401 en las rutas que la exigen) y se
    // loguea la causa, porque el modo de falla silencioso es justo lo que este
    // hallazgo señala: sin log, un 401 masivo parece "el usuario se deslogueó"
    // cuando en realidad hay una base caída detrás.
    sesiones.resolver.mockRejectedValue(new Error('Mongo caído'));
    const request = req('riplanta_sesion=abc123');

    await middleware.use(request, {} as never, next);

    expect(request.sesion).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
