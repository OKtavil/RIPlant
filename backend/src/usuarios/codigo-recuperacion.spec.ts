import {
  formatearCodigoRecuperacion,
  generarCodigoRecuperacion,
  hashearCodigoRecuperacion,
  normalizarCodigoRecuperacion,
} from './codigo-recuperacion';

/**
 * El código de recuperación es el único secreto que permite cambiar una
 * contraseña sin haber iniciado sesión. Estas pruebas fijan las tres garantías
 * de las que depende la seguridad: entropía suficiente, normalización estable
 * (lo que el usuario tipea no tiene que coincidir carácter por carácter con lo
 * que se guardó) y que en la base solo quede un hash.
 */
describe('código de recuperación', () => {
  it('genera 16 caracteres base32 agrupados de a cuatro', () => {
    const codigo = generarCodigoRecuperacion();

    // 16 caracteres de un alfabeto de 32 = 80 bits: no hay fuerza bruta posible
    // contra un `POST /usuarios/recuperar` público.
    expect(codigo).toMatch(/^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$/);
  });

  it('genera códigos distintos en llamadas sucesivas', () => {
    const codigos = new Set(
      Array.from({ length: 50 }, () => generarCodigoRecuperacion()),
    );

    // Con 80 bits, repetir en 50 intentos sería un bug de generación, no azar.
    expect(codigos.size).toBe(50);
  });

  it('normaliza quitando guiones y espacios y pasando a mayúsculas', () => {
    expect(normalizarCodigoRecuperacion('abcd-efgh ijkl-mnop')).toBe(
      'ABCDEFGHIJKLMNOP',
    );
    expect(normalizarCodigoRecuperacion('  ABCD-EFGH-IJKL-MNOP  ')).toBe(
      'ABCDEFGHIJKLMNOP',
    );
  });

  it('hashea igual el código formateado y el normalizado', () => {
    const formateado = 'ABCD-EFGH-IJKL-MNOP';
    const normalizado = 'abcdefghijklmnop';

    expect(hashearCodigoRecuperacion(formateado)).toBe(
      hashearCodigoRecuperacion(normalizado),
    );
    expect(hashearCodigoRecuperacion(formateado)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashea distinto dos códigos distintos', () => {
    expect(hashearCodigoRecuperacion('ABCD-EFGH-IJKL-MNOP')).not.toBe(
      hashearCodigoRecuperacion('ABCD-EFGH-IJKL-MNOQ'),
    );
  });

  it('formatea un código normalizado en grupos de cuatro', () => {
    expect(formatearCodigoRecuperacion('ABCDEFGHIJKLMNOP')).toBe(
      'ABCD-EFGH-IJKL-MNOP',
    );
    // Es idempotente: formatear lo ya formateado no duplica guiones.
    expect(formatearCodigoRecuperacion('ABCD-EFGH-IJKL-MNOP')).toBe(
      'ABCD-EFGH-IJKL-MNOP',
    );
  });
});
