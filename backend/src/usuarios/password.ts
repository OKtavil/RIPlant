import { compare, hash } from 'bcryptjs';

/**
 * Rounds de bcrypt. 10 da ~50ms por hash: correcto para una app real y
 * suficientemente rápido para los tests.
 */
const ROUNDS = 10;

/**
 * Hash válido de un valor que nadie conoce, usado como cebo. No es un secreto:
 * solo necesita tener la forma de un hash bcrypt para que `compare` tarde lo
 * mismo que con un hash real.
 */
const HASH_CEBO =
  '$2b$10$/7QtuQVI4Iafa5bP5bgDMeH9chNnleXbsD6ajap69I.Ib58YViysW';

export function hashPassword(clave: string): Promise<string> {
  return hash(clave, ROUNDS);
}

/**
 * `passwordHash` puede ser `null` cuando el username no existe. En ese caso se
 * compara igualmente contra el cebo, para que un username inexistente y una
 * contraseña incorrecta tarden lo mismo. Sin esto, la duración de la respuesta
 * revela qué usernames están registrados (ataque de temporización).
 */
export async function verifyPassword(
  clave: string,
  passwordHash: string | null,
): Promise<boolean> {
  return compare(clave, passwordHash ?? HASH_CEBO);
}
