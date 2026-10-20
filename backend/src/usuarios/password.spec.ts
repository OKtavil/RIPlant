import { hashPassword, verifyPassword } from './password';

describe('password helpers', () => {
  it('should hash a password and verify it', async () => {
    const hashGuardado = await hashPassword('secreto');

    expect(hashGuardado).not.toBe('secreto');
    expect(hashGuardado.startsWith('$2')).toBe(true);
    expect(await verifyPassword('secreto', hashGuardado)).toBe(true);
  });

  it('should reject a wrong password', async () => {
    const hashGuardado = await hashPassword('secreto');

    expect(await verifyPassword('otra', hashGuardado)).toBe(false);
  });

  it('should produce a different hash for the same password', async () => {
    const [primero, segundo] = await Promise.all([
      hashPassword('secreto'),
      hashPassword('secreto'),
    ]);

    expect(primero).not.toBe(segundo);
  });

  /**
   * `R3-null-hash-path`. El nombre del hallazgo apunta a `passwordHash` nulo,
   * pero ese caso ya está cubierto: `?? HASH_CEBO` lo reemplaza por el cebo y
   * `compare` devuelve `false`. Lo que **no** está cubierto es un
   * `passwordHash` que no sea un string, y ese caso sí es alcanzable:
   * `@Prop({ required: true })` de Mongoose rechaza `null` y `undefined` pero
   * **acepta un número** (verificado), y nada impide que un documento viejo o
   * una escritura por fuera del modelo lo deje así. En ese caso `compare`
   * lanza, y el login devuelve 500 en vez de 401.
   */
  describe('hash corrupto (no-string)', () => {
    const corruptos: Array<[string, unknown]> = [
      ['un número', 12345],
      ['un objeto', {}],
      ['un array', []],
      ['un booleano', true],
      ['NaN', NaN],
    ];

    it.each(corruptos)(
      'rechaza el login, sin lanzar, cuando el hash es %s',
      async (_etiqueta, corrupto) => {
        await expect(
          verifyPassword('cualquiera', corrupto as string),
        ).resolves.toBe(false);
      },
    );

    it('sigue rechazando el hash nulo (el caso que ya cubría el cebo)', async () => {
      await expect(verifyPassword('cualquiera', null)).resolves.toBe(false);
    });
  });
});
