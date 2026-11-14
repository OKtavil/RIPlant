import { createHash, randomInt } from 'node:crypto';

/**
 * Código de recuperación de contraseña.
 *
 * **Por qué existe.** El usuario no tiene email ni teléfono guardado, así que
 * no hay canal de recuperación externo. Este código es el "segundo factor
 * offline": se muestra una sola vez (al registrarse o al regenerarlo desde el
 * perfil) y sirve para elegir una contraseña nueva sin haber iniciado sesión.
 *
 * **Qué garantiza.**
 * - 16 caracteres de base32 (32 = potencia de 2, así `randomInt` no introduce
 *   sesgo por módulo) = 80 bits de entropía. Adivinarlo no es viable.
 * - En la base vive **solo** su SHA-256, nunca el código en claro: si la
 *   colección se filtra, los códigos no sirven para entrar.
 * - La normalización vuelve equivalente lo que el usuario tipea con guiones,
 *   espacios o minúsculas.
 * - Es de un solo uso: `recuperar` borra el hash al cambiar la contraseña.
 */

/** Alfabeto RFC 4648 en mayúsculas: 32 símbolos, sin ambigüedad de longitud. */
export const ALFABETO_BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** 16 caracteres = 80 bits. Mostrados como 4 grupos de 4. */
const LARGO_CODIGO = 16;

const TAMANO_GRUPO = 4;

/** Genera un código nuevo, ya formateado para mostrar (`ABCD-EFGH-IJKL-MNOP`). */
export function generarCodigoRecuperacion(): string {
  let normalizado = '';
  for (let indice = 0; indice < LARGO_CODIGO; indice += 1) {
    normalizado += ALFABETO_BASE32[randomInt(0, ALFABETO_BASE32.length)];
  }
  return formatearCodigoRecuperacion(normalizado);
}

/**
 * Deja el código en su forma canónica: sin separadores y en mayúsculas. Es la
 * forma que se hashea y la que se compara contra la base.
 */
export function normalizarCodigoRecuperacion(codigo: string): string {
  return codigo.replace(/[\s-]/g, '').toUpperCase();
}

/**
 * SHA-256 del código normalizado, en hex. Es lo único que se guarda.
 *
 * SHA-256 y no bcrypt a propósito: la entrada ya tiene 80 bits de entropía (no
 * es adivinable por diccionario) y la comparación tiene que ser barata, porque
 * `POST /usuarios/recuperar` es público y no debe gastar bcrypt antes de saber
 * que el código es correcto.
 */
export function hashearCodigoRecuperacion(codigo: string): string {
  return createHash('sha256')
    .update(normalizarCodigoRecuperacion(codigo))
    .digest('hex');
}

/** Agrupa el código normalizado en bloques de cuatro para mostrarlo. */
export function formatearCodigoRecuperacion(codigo: string): string {
  const normalizado = normalizarCodigoRecuperacion(codigo);
  const grupos = normalizado.match(new RegExp(`.{1,${TAMANO_GRUPO}}`, 'g'));
  return grupos ? grupos.join('-') : '';
}
