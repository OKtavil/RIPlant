import type { Model } from 'mongoose';
import { hashearCodigoRecuperacion } from './codigo-recuperacion';
import type { AlmacenamientoService } from '../almacenamiento/almacenamiento.interface';
import { hashPassword, verifyPassword } from './password';
import { UsuariosService } from './usuarios.service';
import type { UsuarioDocument } from './usuario.schema';

/** Consulta Mongoose mínima: `.select()` encadenable y `.lean()` resoluble. */
function consultaLean<T>(valor: T) {
  const consulta = {
    select: jest.fn(),
    lean: jest.fn().mockResolvedValue(valor),
  };
  consulta.select.mockReturnValue(consulta);
  return consulta;
}

describe('UsuariosService', () => {
  let service: UsuariosService;
  let model: {
    create: jest.Mock;
    updateOne: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
  };
  let almacenamiento: AlmacenamientoService;
  let borrarFoto: jest.Mock;
  const ID = '507f1f77bcf86cd799439011';
  const dave = {
    _id: ID,
    username: 'dave',
    rol: 'usuario',
    insignias: [],
    descripcion: '',
  };

  beforeEach(() => {
    model = {
      create: jest.fn().mockResolvedValue({ ...dave }),
      updateOne: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockReturnValue(consultaLean(null)),
      findOneAndUpdate: jest.fn().mockReturnValue(consultaLean(null)),
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      findById: jest.fn().mockReturnValue(consultaLean(null)),
      findByIdAndUpdate: jest.fn().mockReturnValue(consultaLean(null)),
    };
    borrarFoto = jest.fn().mockResolvedValue(undefined);
    almacenamiento = {
      guardar: jest.fn().mockResolvedValue({
        nombreArchivo: 'avatar.png',
        rutaPublica: '/uploads/avatar.png',
        tipo: 'image/png',
        bytes: 10,
      }),
      borrar: borrarFoto,
    } as unknown as AlmacenamientoService;
    service = new UsuariosService(
      model as unknown as Model<UsuarioDocument>,
      almacenamiento,
    );
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.NODE_ENV;
  });

  it('should seed the admin with the password from the environment', async () => {
    process.env.ADMIN_USERNAME = 'jefa';
    process.env.ADMIN_PASSWORD = 'clave-elegida';

    await service.onModuleInit();

    expect(model.updateOne).toHaveBeenCalledTimes(1);
    const [filtro, update, opciones] = model.updateOne.mock.calls[0];
    expect(filtro).toEqual({ username: 'jefa' });
    expect(opciones).toEqual({ upsert: true });
    expect(update.$set.rol).toBe('admin');
    expect(update.$set.passwordHash).not.toContain('clave-elegida');
    expect(await verifyPassword('clave-elegida', update.$set.passwordHash)).toBe(
      true,
    );
  });

  it('should seed a development default outside production', async () => {
    await service.onModuleInit();

    const [, update] = model.updateOne.mock.calls[0];
    expect(update.$set.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(await verifyPassword('riplanta123', update.$set.passwordHash)).toBe(
      true,
    );
  });

  it('should not seed anything in production without ADMIN_PASSWORD', async () => {
    process.env.NODE_ENV = 'production';

    await service.onModuleInit();

    expect(model.updateOne).not.toHaveBeenCalled();
  });

  it('expone la descripción en el perfil público', async () => {
    model.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        ...dave,
        descripcion: 'A dave le gustan los tacos, ¿quieres uno?',
      }),
    });

    await expect(service.porId(ID)).resolves.toMatchObject({
      username: 'dave',
      descripcion: 'A dave le gustan los tacos, ¿quieres uno?',
    });
  });

  it('un id inválido es "no existe", no un 500 de Mongoose', async () => {
    // `findById('no-es-un-id')` lanza `CastError`; para el cliente tiene que ser
    // el mismo 404 que un id válido sin documento.
    await expect(service.porId('no-es-un-id')).resolves.toBeNull();
    expect(model.findById).not.toHaveBeenCalled();
  });

  it('lista los perfiles sin la cuenta reservada zombie', async () => {
    model.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([dave]),
    });

    await expect(service.listarPublico()).resolves.toMatchObject([
      { username: 'dave', descripcion: '' },
    ]);
    const [filtro] = model.find.mock.calls[0];
    expect(filtro).toEqual({ rol: { $ne: 'zombie' } });
  });

  it('solo el dueño o un admin editan la descripción', async () => {
    model.findByIdAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ ...dave, descripcion: 'hola' }),
    });

    await expect(
      service.actualizarDescripcion(ID, 'hola', {
        usuario: { id: 'otro-usuario', rol: 'usuario' },
      }),
    ).rejects.toThrow('Solo el dueño o un admin pueden editar la descripción');
    expect(model.findByIdAndUpdate).not.toHaveBeenCalled();

    // El dueño puede, y se recortan los extremos antes de guardar.
    await expect(
      service.actualizarDescripcion(ID, '  hola  ', {
        usuario: { id: ID, rol: 'usuario' },
      }),
    ).resolves.toMatchObject({ descripcion: 'hola' });
    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
      ID,
      { descripcion: 'hola' },
      { new: true },
    );

    // Un admin puede editar la de otro.
    await expect(
      service.actualizarDescripcion(ID, 'hola', {
        usuario: { id: 'admin-1', rol: 'admin' },
      }),
    ).resolves.toMatchObject({ username: 'dave' });
  });

  describe('actualizarPerfil', () => {
    const sesion = { usuario: { id: ID, rol: 'usuario' } };

    it('actualiza descripción e imagen sin tocar la contraseña', async () => {
      const actual = { ...dave, avatarUrl: '/uploads/anterior.png' };
      model.findById.mockReturnValue(consultaLean(actual));
      model.findByIdAndUpdate.mockReturnValue(
        consultaLean({
          ...actual,
          descripcion: 'Mi jardín',
          avatarUrl: '/uploads/avatar.png',
        }),
      );

      await expect(
        service.actualizarPerfil(ID, { descripcion: ' Mi jardín ' }, Buffer.from('imagen'), sesion),
      ).resolves.toMatchObject({
        descripcion: 'Mi jardín',
        avatarUrl: '/uploads/avatar.png',
      });

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        ID,
        { $set: { descripcion: 'Mi jardín', avatarUrl: '/uploads/avatar.png' } },
        { new: true, runValidators: true },
      );
      expect(borrarFoto).toHaveBeenCalledWith('/uploads/anterior.png');
    });

    it('exige y verifica la contraseña actual antes de reemplazarla', async () => {
      const actual = { ...dave, passwordHash: await hashPassword('clave-actual') };
      model.findById.mockReturnValue(consultaLean(actual));
      model.findByIdAndUpdate.mockReturnValue(
        consultaLean({ ...dave, descripcion: '', avatarUrl: '' }),
      );

      await expect(
        service.actualizarPerfil(ID, { passwordNueva: 'clave-nueva-1' }, undefined, sesion),
      ).rejects.toThrow('Ingresá tu contraseña actual para cambiarla');
      await expect(
        service.actualizarPerfil(
          ID,
          { passwordActual: 'incorrecta', passwordNueva: 'clave-nueva-1' },
          undefined,
          sesion,
        ),
      ).rejects.toThrow('La contraseña actual no es correcta');

      await service.actualizarPerfil(
        ID,
        { passwordActual: 'clave-actual', passwordNueva: 'clave-nueva-1' },
        undefined,
        sesion,
      );
      const [, actualizacion] = model.findByIdAndUpdate.mock.calls[0];
      expect(await verifyPassword('clave-nueva-1', actualizacion.$set.passwordHash)).toBe(true);
    });

    it('rechaza editar el perfil de otra persona', async () => {
      await expect(
        service.actualizarPerfil(
          ID,
          { descripcion: 'No' },
          undefined,
          { usuario: { id: 'otro', rol: 'usuario' } },
        ),
      ).rejects.toThrow('Solo el dueño o un admin pueden editar el perfil');
      expect(model.findById).not.toHaveBeenCalled();
    });
  });

  describe('código de recuperación', () => {
    const CODIGO = 'ABCD-EFGH-IJKL-MNOP';

    it('al crear la cuenta devuelve el código una vez y guarda solo su hash', async () => {
      const { usuario, codigoRecuperacion } = await service.crear({
        username: '  dave  ',
        password: 'clave-larga-1',
        rol: 'usuario',
      });

      expect(usuario.username).toBe('dave');
      expect(codigoRecuperacion).toMatch(/^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$/);

      const guardado = model.create.mock.calls[0][0];
      expect(guardado.codigoRecuperacionHash).toBe(
        hashearCodigoRecuperacion(codigoRecuperacion),
      );
      expect(guardado.codigoRecuperacionHash).not.toBe(codigoRecuperacion);
      expect(guardado.codigoRecuperacionHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('identificarPorCodigo rechaza con el mensaje genérico y no gasta bcrypt', async () => {
      model.findOne.mockReturnValue(consultaLean(null));

      await expect(
        service.identificarPorCodigo({ username: 'dave', codigo: CODIGO }),
      ).rejects.toThrow('El usuario y el código no coinciden.');

      expect(model.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('identificarPorCodigo normaliza el código antes de buscarlo', async () => {
      model.findOne.mockReturnValue(consultaLean({ _id: ID }));

      const id = await service.identificarPorCodigo({
        username: '  dave  ',
        codigo: 'abcd-efgh ijkl-mnop',
      });

      expect(id).toBe(ID);
      expect(model.findOne).toHaveBeenCalledWith({
        username: 'dave',
        codigoRecuperacionHash: hashearCodigoRecuperacion('ABCDEFGHIJKLMNOP'),
      });
      // `select: false` exige pedir el hash explícitamente.
      expect(model.findOne.mock.results[0].value.select).toHaveBeenCalledWith(
        '_id',
      );
    });

    it('cambiarPasswordConCodigo cambia la contraseña y borra el código de un solo uso', async () => {
      model.findOneAndUpdate.mockReturnValue(consultaLean({ _id: ID }));

      await service.cambiarPasswordConCodigo({
        usuarioId: ID,
        codigo: CODIGO,
        password: 'clave-nueva-1',
      });

      const [filtro, update, opciones] = model.findOneAndUpdate.mock.calls[0];
      expect(filtro).toEqual({
        _id: ID,
        codigoRecuperacionHash: hashearCodigoRecuperacion(CODIGO),
      });
      expect(update.$unset).toEqual({ codigoRecuperacionHash: '' });
      expect(update.$set.passwordHash).toMatch(/^\$2[aby]\$/);
      expect(
        await verifyPassword('clave-nueva-1', update.$set.passwordHash),
      ).toBe(true);
      expect(opciones).toEqual({ new: true });
    });

    it('cambiarPasswordConCodigo no toca nada si el código se consumió antes', async () => {
      // Carrera: otro pedido (o una rotación) ya borró el hash, el filtro
      // condicional no matchea y la contraseña queda intacta.
      model.findOneAndUpdate.mockReturnValue(consultaLean(null));

      await expect(
        service.cambiarPasswordConCodigo({
          usuarioId: ID,
          codigo: CODIGO,
          password: 'clave-nueva-1',
        }),
      ).rejects.toThrow('El usuario y el código no coinciden.');
    });

    it('el dueño solo emite un código nuevo con su contraseña actual', async () => {
      model.findById.mockReturnValue(
        consultaLean({ ...dave, passwordHash: await hashPassword('correcta') }),
      );

      await expect(
        service.emitirCodigoRecuperacion(ID, 'incorrecta', {
          usuario: { id: ID, rol: 'usuario' },
        }),
      ).rejects.toThrow('La contraseña actual no es correcta');
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('el dueño con la contraseña correcta recibe un código nuevo', async () => {
      model.findById.mockReturnValue(
        consultaLean({ ...dave, passwordHash: await hashPassword('correcta') }),
      );
      model.findByIdAndUpdate.mockReturnValue(consultaLean({ ...dave }));

      const { codigoRecuperacion } = await service.emitirCodigoRecuperacion(
        ID,
        'correcta',
        { usuario: { id: ID, rol: 'usuario' } },
      );

      expect(codigoRecuperacion).toMatch(/^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$/);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        ID,
        {
          $set: {
            codigoRecuperacionHash:
              hashearCodigoRecuperacion(codigoRecuperacion),
          },
        },
        { new: true },
      );
    });

    it('un admin emite para cualquiera sin pedir contraseña', async () => {
      model.findByIdAndUpdate.mockReturnValue(consultaLean({ ...dave }));

      const { codigoRecuperacion } = await service.emitirCodigoRecuperacion(
        ID,
        undefined,
        { usuario: { id: 'admin-1', rol: 'admin' } },
      );

      expect(codigoRecuperacion).toMatch(/^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$/);
      // Sin contraseña que probar: ni siquiera se lee el usuario.
      expect(model.findById).not.toHaveBeenCalled();
      expect(model.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    });

    it('un tercero no puede emitir un código para otro', async () => {
      await expect(
        service.emitirCodigoRecuperacion(ID, 'lo-que-sea', {
          usuario: { id: 'otro-usuario', rol: 'usuario' },
        }),
      ).rejects.toThrow(
        'Solo el dueño o un admin pueden emitir un código de recuperación',
      );
      expect(model.findById).not.toHaveBeenCalled();
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('un id inválido al emitir es 404, no un 500 de Mongoose', async () => {
      await expect(
        service.emitirCodigoRecuperacion('no-es-un-id', undefined, {
          usuario: { id: 'admin-1', rol: 'admin' },
        }),
      ).rejects.toThrow('Usuario no encontrado');
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });
});
