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
});
