import type { CookieOptions, Response } from 'express';

export const COOKIE_SESION = 'riplanta_sesion';

export const OPCIONES_COOKIE: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  // Solo por HTTPS fuera de desarrollo. Sin esto, una cookie httpOnly viaja en
  // claro y cualquiera en la red la lee.
  secure: process.env.NODE_ENV === 'production',
};

export function escribirCookieSesion(
  res: Response,
  token: string,
  ttlMs: number,
): void {
  res.cookie(COOKIE_SESION, token, { ...OPCIONES_COOKIE, maxAge: ttlMs });
}

export function borrarCookieSesion(res: Response): void {
  // Express borra la cookie cuando nombre y atributos coinciden con los de
  // escritura. Pasar `httpOnly` de más es inofensivo; lo que no debe faltar es
  // `path` y `sameSite`, o el browser deja la cookie vieja viva.
  res.clearCookie(COOKIE_SESION, OPCIONES_COOKIE);
}

/**
 * Lee `req.headers.cookie` a mano. No se usa `cookie-parser` porque para una
 * sola cookie no vale la pena añadir una dependencia.
 */
export function leerCookie(
  header: string | undefined,
  nombre: string,
): string | undefined {
  if (!header) return undefined;
  for (const parte of header.split(';')) {
    const [clave, ...resto] = parte.trim().split('=');
    if (clave?.trim() === nombre) {
      // Un valor con percent-encoding inválido (por ejemplo `%E0%A4%A`) hace
      // que `decodeURIComponent` lance `URIError`. Sin este try/catch el error
      // sale por `SesionesMiddleware`, que corre en todas las rutas, y
      // cualquier request que traiga la cookie rota termina en 500, incluso en
      // rutas públicas. Un valor que no se puede decodificar no es un token
      // nuestro: los tokens son base64url y nunca necesitan decodificarse, así
      // que se trata como cookie ausente (sin sesión) en vez de adivinar.
      try {
        return decodeURIComponent(resto.join('=').trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}
