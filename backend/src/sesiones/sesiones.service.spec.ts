import { createHash } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { SesionesService } from './sesiones.service';
import type { SesionDocument } from './sesion.schema';
import type { Model } from 'mongoose';
import type { UsuariosService } from '../usuarios/usuarios.service';

describe('SesionesService', () => {
  let service: SesionesService;
  let model: {
    create: jest.Mock;
    findOne: jest.Mock;
    deleteOne: jest.Mock;
  };
  let usuarios: {
    validarCredenciales: jest.Mock;
    encontrarPorId: jest.Mock;
  };

  /** El mismo SHA-256 que usa el servicio: el token nunca viaja a la base. */
  function sha256(valor: string): string {
    return createHash('sha256').update(valor).digest('hex');
  }

  beforeEach(() => {
    model = {
      create: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    usuarios = {
      validarCredenciales: jest.fn(),
      encontrarPorId: jest.fn(),
    };
    service = new SesionesService(
      model as unknown as Model<SesionDocument>,
      usuarios as unknown as UsuariosService,
    );
  });

  it('should throw UnauthorizedException when credentials are invalid', async () => {
    usuarios.validarCredenciales.mockResolvedValue(null);

    await expect(service.iniciar('jardinero', 'mala')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(model.create).not.toHaveBeenCalled();
  });

  it('should store only the sha256 of the token, never the token itself', async () => {
    const idUsuario = '5f7b1c9e4b3a2d1f0e9d8c7b';
    const usuario = { id: idUsuario, username: 'admin', rol: 'admin' as const };
    usuarios.validarCredenciales.mockResolvedValue(usuario);

    const { token } = await service.iniciar('admin', 'buena');

    expect(token.length).toBeGreaterThan(30);
    const guardado = model.create.mock.calls[0][0];
    expect(guardado.tokenHash).not.toBe(token);
    expect(guardado.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(String(guardado.usuarioId)).toBe(idUsuario);
  });

  it('should set expiraEn using SESION_TTL_HORAS', async () => {
    process.env.SESION_TTL_HORAS = '2';
    usuarios.validarCredenciales.mockResolvedValue({
      id: '5f7b1c9e4b3a2d1f0e9d8c7b',
      username: 'admin',
      rol: 'admin' as const,
    });

    const antes = Date.now();
    await service.iniciar('admin', 'buena');
    const guardado = model.create.mock.calls[0][0];

    expect(guardado.expiraEn.getTime()).toBeGreaterThanOrEqual(
      antes + 2 * 60 * 60 * 1000,
    );
    expect(guardado.expiraEn.getTime()).toBeLessThanOrEqual(
      Date.now() + 2 * 60 * 60 * 1000,
    );
    delete process.env.SESION_TTL_HORAS;
  });

  it('should resolve null when there is no token', async () => {
    expect(await service.resolver(undefined)).toBeNull();
    expect(model.findOne).not.toHaveBeenCalled();
  });

  it('should resolve null for an unknown token', async () => {
    expect(await service.resolver('desconocido')).toBeNull();
  });

  it('should return null and delete an expired session', async () => {
    model.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        tokenHash: sha256('vencido'),
        usuarioId: 'u1',
        expiraEn: new Date(Date.now() - 1000),
      }),
    });

    expect(await service.resolver('vencido')).toBeNull();
    expect(model.deleteOne).toHaveBeenCalledWith({ tokenHash: sha256('vencido') });
    expect(usuarios.encontrarPorId).not.toHaveBeenCalled();
  });

  it('should delete the session when the user no longer exists', async () => {
    model.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        tokenHash: sha256('huerfana'),
        usuarioId: 'borrado',
        expiraEn: new Date(Date.now() + 60_000),
      }),
    });
    usuarios.encontrarPorId.mockResolvedValue(null);

    expect(await service.resolver('huerfana')).toBeNull();
    expect(model.deleteOne).toHaveBeenCalledWith({ tokenHash: sha256('huerfana') });
  });

  it('should return the active session with its user', async () => {
    const expiraEn = new Date(Date.now() + 60_000);
    model.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        tokenHash: sha256('valida'),
        usuarioId: 'u1',
        expiraEn,
      }),
    });
    usuarios.encontrarPorId.mockResolvedValue({
      id: 'u1',
      username: 'admin',
      rol: 'admin' as const,
    });

    expect(await service.resolver('valida')).toEqual({
      usuario: { id: 'u1', username: 'admin', rol: 'admin' },
      expiraEn,
    });
  });

  it('should delete the stored session on cerrar', async () => {
    await service.cerrar('token-a-borrar');

    expect(model.deleteOne).toHaveBeenCalledWith({
      tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });
});
