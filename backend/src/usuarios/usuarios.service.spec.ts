import type { Model } from 'mongoose';
import { verifyPassword } from './password';
import { UsuariosService } from './usuarios.service';
import type { UsuarioDocument } from './usuario.schema';

describe('UsuariosService', () => {
  let service: UsuariosService;
  let model: {
    updateOne: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
  };
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
      updateOne: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      findById: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    };
    service = new UsuariosService(
      model as unknown as Model<UsuarioDocument>,
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
});
