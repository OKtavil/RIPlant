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
 * Forma de un hash bcrypt completo: `$2b$10$` + 53 caracteres del alfabeto
 * bcrypt. El largo importa: un hash truncado haría fallar el `salt` y `compare`
 * volvería en microsegundos en vez de tardar los ~65 ms de un hash real.
 */
const FORMA_HASH_BCRYPT = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/**
 * `passwordHash` puede ser `null` cuando el username no existe. En ese caso se
 * compara igualmente contra el cebo, para que un username inexistente y una
 * contraseña incorrecta tarden lo mismo. Sin esto, la duración de la respuesta
 * revela qué usernames están registrados (ataque de temporización).
 *
 * **`R3-null-hash-path`.** El caso `null` ya estaba cubierto; el que faltaba es
 * un `passwordHash` que **no tenga forma de hash**: `@Prop({ required: true })`
 * de Mongoose rechaza `null` y `undefined`, pero **acepta un número**, y nada
 * impide que un documento viejo o una escritura por fuera del modelo lo deje
 * así. `bcryptjs` lanza `Illegal arguments` con un no-string y devuelve `false`
 * en microsegundos con un string malformado: lo primero era un `500` en el
 * login, lo segundo reabría el ataque de temporización que el cebo cierra.
 *
 * Por eso se valida la **forma** y no el tipo: lo que no parece un hash se
 * compara contra el cebo, que siempre tarda lo mismo y siempre da `false`.
 */
export async function verifyPassword(
  clave: string,
  passwordHash: string | null | undefined,
): Promise<boolean> {
  const candidato =
    typeof passwordHash === 'string' && FORMA_HASH_BCRYPT.test(passwordHash)
      ? passwordHash
      : HASH_CEBO;
  return compare(clave, candidato);
}
