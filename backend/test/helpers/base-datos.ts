import { randomUUID } from 'node:crypto';

/**
 * Aislamiento de las bases de datos de los e2e.
 *
 * **Por qué existe (R3-e2e-shared-db).** `ConfigModule` carga `backend/.env`, así
 * que la suite e2e leía `MONGODB_URI` y escribía en la base de desarrollo
 * `riplanta`. Dos consecuencias, las dos reales:
 *
 * 1. Cada corrida de e2e ensuciaba la base con la que se desarrolla a mano.
 * 2. Las cinco suites corren en paralelo (Jest las reparte por archivo),
 *    contra **una sola** base. `categorias.e2e-spec.ts` hace `deleteMany({})`
 *    sobre `categorias` en cada `afterEach`: con una base compartida, esa suite
 *    le borra las categorías a las otras mientras corren. No era solo suciedad,
 *    era un test que podía fallar sin que nadie hubiera roto nada.
 *
 * **Cómo se arregla.** Cada suite llama a `prepararBaseAislada()` **antes** de
 * importar `AppModule`, y se queda con su propia base. `process.env` gana sobre
 * `.env` en `ConfigModule` (verificado: `{ ...desdeArchivo, ...process.env }`),
 * así que definir `MONGODB_URI` acá alcanza.
 *
 * El nombre lleva el nombre del archivo de test, el id del worker y un uuid:
 * legible en `mongosh`, y único aunque dos workers corran el mismo archivo (pasa
 * en modo watch o con `--repeatTests`).
 */

/** Prefijo común: permite encontrar y borrar bases viejas de un saque. */
export const PREFIJO_BASES_E2E = 'riplanta_e2e_';

/**
 * URI de una base aislada, derivada de la configurada en `.env` para conservar
 * host y puerto (el 27018 del contenedor, típicamente) y cambiar solo el nombre
 * de la base.
 */
export function uriBaseAislada(nombreBase?: string): string {
  const configurada =
    process.env.MONGODB_URI ?? 'mongodb://localhost:27018/riplanta';
  const base = nombreBase ?? nombreBaseAislada();
  return reemplazarNombreDeBase(configurada, base);
}

/**
 * Reemplaza el nombre de base de una URI de Mongo sin tocar host, puerto,
 * credenciales ni query string. Se hace con `URL` y no con regex porque el
 * nombre de base es el *pathname*: un split por `/` se rompe en cuanto aparecen
 * usuario y contraseña (`mongodb://user:pass@host/db`), que es justo cuando más
 * duele.
 */
function reemplazarNombreDeBase(uri: string, nombreBase: string): string {
  const url = new URL(uri);
  url.pathname = `/${nombreBase}`;
  return url.toString();
}

/** Nombre único y legible para la base de una suite. */
function nombreBaseAislada(): string {
  // En Jest, `expect.getState().testPath` no está disponible antes de los tests;
  // este helper corre en `beforeAll`, donde sí lo está. Si no, cae a `global`.
  const testPath =
    expect.getState().testPath ?? process.env.JEST_WORKER_ID ?? 'global';
  const archivo = testPath.split('/').pop()?.replace(/\.e2e-spec\.ts$/, '') ?? 'suite';
  const worker = process.env.JEST_WORKER_ID ?? '0';
  const unico = randomUUID().slice(0, 8);
  return `${PREFIJO_BASES_E2E}${archivo}_w${worker}_${unico}`;
}

/**
 * Fija `MONGODB_URI` a una base aislada y devuelve su nombre, para poder
 * borrarla después.
 *
 * **Hay que llamarla antes de importar `AppModule`.** `MongooseModule.forRootAsync`
 * lee `MONGODB_URI` cuando el módulo se construye; si ya se construyó, el cambio
 * no tiene efecto. En la práctica: al tope del archivo, o en un `beforeAll` que
 * corra antes de `Test.createTestingModule(...).compile()`.
 */
export function prepararBaseAislada(): string {
  const uri = uriBaseAislada();
  process.env.MONGODB_URI = uri;
  return nombreDeBaseDeUri(uri);
}

/** Extrae el nombre de base de una URI, para reportes y limpieza. */
export function nombreDeBaseDeUri(uri: string): string {
  return new URL(uri).pathname.replace(/^\//, '');
}

/**
 * Borra la base indicada. Se llama en `afterAll`, también cuando el test falló,
 * que es justamente el caso en el que la limpieza por colección de antes dejaba
 * basura.
 *
 * Usa el driver de Mongo directo y no la conexión de Nest: `app.close()` pudo
 * haber cerrado ya esa conexión, y una base que no se puede borrar vuelve a ser
 * basura acumulada.
 */
export async function borrarBaseAislada(
  nombreBase: string,
  uri: string = process.env.MONGODB_URI ?? '',
): Promise<void> {
  const cliente = new (MongoClientDeMongoose())(sinNombreDeBase(uri));
  try {
    await cliente.connect();
    await cliente.db(nombreBase).dropDatabase();
  } finally {
    await cliente.close();
  }
}

/**
 * El driver de Mongo **a través de mongoose**.
 *
 * `mongodb` no es dependencia directa de `backend`: llega por hoisting de
 * `mongoose`. Importarlo por su nombre funciona hoy y se rompe en cuanto el
 * hoisting cambie de forma (un `pnpm dedupe`, un layout más estricto), que es
 * exactamente la fragilidad que ya mordió con `file-type` en T7. `mongoose` sí
 * es dependencia directa y reexporta el driver, así que se usa eso y no se
 * agrega una dependencia nueva para un helper de tests.
 */
function MongoClientDeMongoose(): new (
  uri: string,
  opciones?: { serverSelectionTimeoutMS?: number },
) => {
  connect(): Promise<unknown>;
  db(nombre?: string): {
    dropDatabase(): Promise<unknown>;
    admin(): { listDatabases(): Promise<{ databases: Array<{ name: string }> }> };
  };
  close(): Promise<void>;
} {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mongoose = require('mongoose');
  return mongoose.mongo.MongoClient;
}

/**
 * Cuánto esperar a que aparezca Mongo en los helpers de test.
 *
 * El driver espera 30 s por defecto. Para un test eso es una eternidad: si el
 * contenedor no está levantado, conviene saberlo en dos segundos y con un
 * mensaje que lo diga, no quedarse colgado medio minuto.
 */
export const TIMEOUT_SELECCION_MS = 2000;

/** La misma URI, pero sin nombre de base: para conectarse y poder dropear. */
function sinNombreDeBase(uri: string): string {
  const url = new URL(uri);
  url.pathname = '/';
  return url.toString();
}

/**
 * Borra toda base que haya quedado de una corrida anterior. Se llama desde el
 * `globalSetup`: si una corrida se cortó a la mitad (Ctrl-C, un crash), su base
 * quedó viva, y sin esto se acumularían para siempre.
 *
 * Devuelve los nombres borrados, para poder loguearlos.
 */
export async function borrarBasesViejasE2E(
  uriDeReferencia?: string,
): Promise<string[]> {
  const uri =
    uriDeReferencia ??
    process.env.MONGODB_URI ??
    'mongodb://localhost:27018/riplanta';
  const cliente = new (MongoClientDeMongoose())(sinNombreDeBase(uri), {
    serverSelectionTimeoutMS: TIMEOUT_SELECCION_MS,
  });
  try {
    await cliente.connect();
    const admin = cliente.db().admin();
    const { databases } = await admin.listDatabases();
    const viejas = databases
      .map((d) => d.name)
      .filter((nombre) => nombre.startsWith(PREFIJO_BASES_E2E));

    for (const nombre of viejas) {
      await cliente.db(nombre).dropDatabase();
    }
    return viejas;
  } finally {
    await cliente.close();
  }
}
