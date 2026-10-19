import type { Model } from 'mongoose';
import { verifyPassword } from './password';
import { UsuariosService } from './usuarios.service';
import type { UsuarioDocument } from './usuario.schema';

describe('UsuariosService (siembra del administrador)', () => {
  let service: UsuariosService;
  let model: { updateOne: jest.Mock; findOne: jest.Mock };

  beforeEach(() => {
    model = {
      updateOne: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
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
});
