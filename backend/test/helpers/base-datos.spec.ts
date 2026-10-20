import {
  PREFIJO_BASES_E2E,
  TIMEOUT_SELECCION_MS,
  borrarBasesViejasE2E,
  nombreDeBaseDeUri,
  prepararBaseAislada,
  uriBaseAislada,
} from './base-datos';

/**
 * El helper existe para que los e2e no escriban en `riplanta`. Si el nombre de
 * base sale mal, el arreglo no arregla nada **y encima falla en silencio**: los
 * tests pasarían escribiendo en la base de desarrollo, que es exactamente el bug
 * original. Por eso se prueba el armado de la URI, que es la parte donde un
 * error no se nota.
 */
describe('aislamiento de la base de los e2e', () => {
  const original = process.env.MONGODB_URI;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.MONGODB_URI;
    } else {
      process.env.MONGODB_URI = original;
    }
  });

  describe('uriBaseAislada', () => {
    it('cambia el nombre de la base y conserva host y puerto', () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27018/riplanta';

      const uri = uriBaseAislada('mi_base');

      expect(uri).toContain('localhost:27018');
      expect(uri).toMatch(/\/mi_base$/);
    });

    it('no toca la base de desarrollo aunque la URI venga de .env', () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27018/riplanta';

      const nombre = nombreDeBaseDeUri(uriBaseAislada());

      expect(nombre).not.toBe('riplanta');
      expect(nombre.startsWith(PREFIJO_BASES_E2E)).toBe(true);
    });

    it('conserva usuario, contraseña y query string', () => {
      process.env.MONGODB_URI =
        'mongodb://user:secreto@mongo.example:27017/riplanta?authSource=admin';

      const uri = uriBaseAislada('mi_base');

      expect(uri).toContain('user:secreto@mongo.example:27017');
      expect(uri).toContain('authSource=admin');
      expect(nombreDeBaseDeUri(uri)).toBe('mi_base');
    });

    it('usa el host por defecto si no hay URI configurada', () => {
      delete process.env.MONGODB_URI;

      expect(uriBaseAislada('mi_base')).toContain('localhost:27018');
    });
  });

  describe('prepararBaseAislada', () => {
    it('deja MONGODB_URI apuntando fuera de la base de desarrollo', () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27018/riplanta';

      const nombre = prepararBaseAislada();

      expect(nombre).not.toBe('riplanta');
      expect(process.env.MONGODB_URI).toContain(nombre);
    });

    it('da un nombre distinto cada vez, para que dos suites no colisionen', () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27018/riplanta';

      const una = prepararBaseAislada();
      const otra = prepararBaseAislada();

      expect(una).not.toBe(otra);
    });

    it('arma un nombre legible en mongosh, con el nombre de la suite', () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27018/riplanta';

      const nombre = prepararBaseAislada();

      // El prefijo permite encontrarlas todas juntas; el resto hace que un
      // `show dbs` durante un test diga a qué suite pertenece cada una.
      expect(nombre.startsWith(PREFIJO_BASES_E2E)).toBe(true);
    });
  });

  describe('nombreDeBaseDeUri', () => {
    it('extrae el nombre sin la barra inicial', () => {
      expect(nombreDeBaseDeUri('mongodb://localhost:27018/riplanta')).toBe(
        'riplanta',
      );
    });

    it('ignora la query string', () => {
      expect(
        nombreDeBaseDeUri('mongodb://localhost:27018/riplanta?authSource=admin'),
      ).toBe('riplanta');
    });
  });
});

/**
 * La limpieza de bases viejas necesita Mongo. Se prueba el contrato de la
 * función cuando Mongo no está: un `globalSetup` que se cuelga medio minuto (o
 * que revienta con un stack de driver) le tapa el error real al usuario, que es
 * "te falta levantar el contenedor".
 */
describe('borrarBasesViejasE2E', () => {
  it('rechaza rápido si no puede conectarse, sin colgar la suite', async () => {
    const inicio = Date.now();

    await expect(
      borrarBasesViejasE2E('mongodb://127.0.0.1:1/inalcanzable'),
    ).rejects.toThrow();

    // El punto no es el valor exacto, es que no sea el default de 30 s del
    // driver: un puerto cerrado tiene que fallar en el orden de los segundos.
    const transcurrido = Date.now() - inicio;
    expect(transcurrido).toBeLessThan(TIMEOUT_SELECCION_MS * 3);
  }, 15000);
});
