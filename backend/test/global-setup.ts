/**
 * `globalSetup` de la suite e2e: borra las bases que dejó una corrida anterior.
 *
 * Corre **una vez**, antes de que arranquen los workers. Es el único momento en
 * el que se puede hacer limpieza de lo que quedó de una corrida que se cortó a
 * la mitad: al final de una corrida sana, cada suite borra la suya.
 *
 * No fija `MONGODB_URI` (no serviría: su `process.env` no es el de los workers,
 * y todas las suites comparten un valor). Cada suite llama a
 * `prepararBaseAislada()` por su cuenta. Ver `helpers/base-datos.ts`.
 *
 * Si Mongo no está disponible, **no rompe la suite**: avisa y sigue. Que el
 * arranque falle con un mensaje claro es más útil que un `globalSetup` que
 * explota antes de que el usuario entienda que le falta levantar el contenedor.
 */
import { borrarBasesViejasE2E } from './helpers/base-datos';

export default async function globalSetup(): Promise<void> {
  try {
    const borradas = await borrarBasesViejasE2E();
    if (borradas.length > 0) {
      process.stdout.write(
        `[e2e] Bases de corridas anteriores borradas: ${borradas.join(', ')}\n`,
      );
    }
  } catch (error) {
    process.stdout.write(
      `[e2e] No se pudieron limpiar bases viejas (${(error as Error).message}). ` +
        '¿Está levantado MongoDB?\n',
    );
  }
}
