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
      return decodeURIComponent(resto.join('=').trim());
    }
  }
  return undefined;
}
