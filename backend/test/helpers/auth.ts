import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

/** Devuelve la cookie completa `riplanta_sesion=<token>` desde la respuesta. */
export function extraerCookieSesion(
  setCookie: string[] | string | undefined,
): string {
  const cookies = Array.isArray(setCookie)
    ? setCookie
    : setCookie
      ? [setCookie]
      : [];
  const sesion = cookies.find((cookie) => cookie.startsWith('riplanta_sesion='));
  if (!sesion) {
    throw new Error('La respuesta no incluyó la cookie de sesión');
  }
  return sesion.split(';')[0];
}

/**
 * Abre una sesión contra el server real (pasa por el pipe y por el controller)
 * y devuelve la cookie lista para reenviarla con `.set('Cookie', cookie)`.
 */
export async function abrirSesion(
  app: INestApplication,
  username: string,
  password: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/sesiones')
    .send({ username, password })
    .expect(201);
  return extraerCookieSesion(res.headers['set-cookie']);
}
