import { UsuarioSchema } from './usuario.schema';

/**
 * El hash del código de recuperación es tan sensible como `passwordHash`: si se
 * filtra, cualquiera puede cambiar la contraseña de esa cuenta. `select: false`
 * es la red que impide que salga en una lectura que no lo pida explícitamente.
 */
describe('UsuarioSchema — código de recuperación', () => {
  it('no expone el hash del código salvo que se pida explícitamente', () => {
    const ruta = UsuarioSchema.path('codigoRecuperacionHash');

    expect(ruta).toBeTruthy();
    expect(ruta.options.select).toBe(false);
    expect(ruta.options.required).toBeFalsy();
  });
});
