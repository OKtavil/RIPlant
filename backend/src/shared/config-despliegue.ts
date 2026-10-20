/**
 * Configuración de despliegue que depende del entorno donde corre el backend.
 *
 * Las dos costuras de acá existen porque su default correcto **depende del
 * despliegue**, y hoy el despliegue no está definido: no hay proxy montado
 * (`docker-compose.yml` solo levanta Mongo) ni URL de producción declarada. En
 * vez de inventar valores de producción —o de dejar el default abierto, que es
 * el riesgo real— ambas quedan apagadas por defecto y se activan por entorno
 * cuando exista el despliegue que las justifica.
 *
 * El default de las dos es el **más restrictivo**, no el más cómodo: activar de
 * más abre un agujero, activar de menos solo molesta.
 */

/**
 * Cuántos saltos de proxy confiar para resolver `req.ip`.
 *
 * `req.ip` es lo que usa el rate-limit de login como clave de origen
 * (`sesiones.service.ts`). Sin proxy, es la IP del socket y está bien.
 * **Detrás de un proxy sin configurar esto**, todos los clientes comparten la
 * IP del proxy: cinco fallos ajenos bloquean a todos con ese usuario, y un
 * flood no llega nunca al `429`.
 *
 * Del otro lado está el riesgo opuesto, y es peor: si el backend queda
 * accesible directo *y* confía en `X-Forwarded-For`, cualquiera falsea su IP
 * con ese header y **saltea el rate-limit por completo**, cambiándolo en cada
 * intento. Por eso el default es `false` (no confiar) y el valor se declara
 * explícitamente:
 *
 * - sin definir o inválido → `false` (no confiar; comportamiento actual)
 * - `1` → confiar en el último salto (un reverse proxy adelante)
 * - `N` → confiar en los últimos `N` saltos (varios proxies en cadena)
 *
 * Un valor que no se entiende **apaga** la confianza en vez de encenderla a
 * medias: encender con basura es peor que no encender.
 */
export function saltosDeProxy(): number | false {
  const valor = process.env.RIPLANTA_TRUST_PROXY?.trim();
  if (!valor) return false;

  const saltos = Number(valor);
  if (!Number.isInteger(saltos) || saltos < 1) return false;

  return saltos;
}

/**
 * Orígenes permitidos por CORS, o `true` para reflejar el que pida.
 *
 * El frontend corre en otro puerto en desarrollo (`5173` → `3000`), así que
 * CORS con credenciales es necesario. `origin: true` refleja cualquier origen;
 * el riesgo está acotado por `SameSite=Lax`, que ya impide que el browser
 * adjunte la cookie en un `POST` cross-site (ver la doc de sesiones), pero para
 * un despliegue real una allowlist explícita es lo correcto.
 *
 * - sin definir, vacía o de solo espacios → `true` (refleja; comportamiento actual)
 * - `a.example,b.example` → allowlist exacta de esos orígenes
 *
 * Una variable definida pero vacía es un error de despliegue común; tratarla
 * como allowlist vacía rechazaría **todo** tráfico, así que se interpreta como
 * "sin allowlist" y se documenta el riesgo de dejarla así en producción.
 */
export function corsOriginsPermitidos(): true | string[] {
  const valor = process.env.RIPLANTA_CORS_ORIGINS?.trim();
  if (!valor) return true;

  const origenes = valor
    .split(',')
    .map((origen) => origen.trim())
    .filter((origen) => origen.length > 0);

  return origenes.length > 0 ? origenes : true;
}
