import {
  corsOriginsPermitidos,
  saltosDeProxy,
} from './config-despliegue';

describe('config de despliegue (R1-002, R1-003)', () => {
  // Ambas costuras se leen del entorno en cada llamada, así que cada test
  // restaura lo que encontró. Sin eso, un test contamina al siguiente.
  const originales = {
    trustProxy: process.env.RIPLANTA_TRUST_PROXY,
    corsOrigins: process.env.RIPLANTA_CORS_ORIGINS,
  };

  afterEach(() => {
    if (originales.trustProxy === undefined)
      delete process.env.RIPLANTA_TRUST_PROXY;
    else process.env.RIPLANTA_TRUST_PROXY = originales.trustProxy;

    if (originales.corsOrigins === undefined)
      delete process.env.RIPLANTA_CORS_ORIGINS;
    else process.env.RIPLANTA_CORS_ORIGINS = originales.corsOrigins;
  });

  describe('saltosDeProxy', () => {
    it('no confía en el proxy si la variable no está definida', () => {
      // El default tiene que ser el más restrictivo. `trust proxy` encendido
      // sin proxy real deja que cualquiera falsee su IP con X-Forwarded-For y
      // saltee el rate-limit por completo cambiando el header en cada intento.
      delete process.env.RIPLANTA_TRUST_PROXY;

      expect(saltosDeProxy()).toBe(false);
    });

    it('confía en un solo salto cuando la variable es 1', () => {
      process.env.RIPLANTA_TRUST_PROXY = '1';

      expect(saltosDeProxy()).toBe(1);
    });

    it('acepta varios saltos', () => {
      process.env.RIPLANTA_TRUST_PROXY = '2';

      expect(saltosDeProxy()).toBe(2);
    });

    it('ignora un valor que no es un número de saltos válido', () => {
      // Un valor mal escrito no puede encender la confianza "a medias": si no
      // se entiende, se apaga. Encender con basura es peor que no encender.
      process.env.RIPLANTA_TRUST_PROXY = 'si';

      expect(saltosDeProxy()).toBe(false);
    });

    it('ignora cero y negativos', () => {
      process.env.RIPLANTA_TRUST_PROXY = '0';
      expect(saltosDeProxy()).toBe(false);

      process.env.RIPLANTA_TRUST_PROXY = '-1';
      expect(saltosDeProxy()).toBe(false);
    });
  });

  describe('corsOriginsPermitidos', () => {
    it('refleja el origen cuando no hay allowlist (comportamiento actual)', () => {
      delete process.env.RIPLANTA_CORS_ORIGINS;

      expect(corsOriginsPermitidos()).toBe(true);
    });

    it('devuelve la lista cuando hay varios orígenes', () => {
      process.env.RIPLANTA_CORS_ORIGINS =
        'https://riplanta.example, https://www.riplanta.example';

      expect(corsOriginsPermitidos()).toEqual([
        'https://riplanta.example',
        'https://www.riplanta.example',
      ]);
    });

    it('acepta un solo origen', () => {
      process.env.RIPLANTA_CORS_ORIGINS = 'https://riplanta.example';

      expect(corsOriginsPermitidos()).toEqual(['https://riplanta.example']);
    });

    it('ignora una lista vacía o de solo espacios', () => {
      // Una variable definida pero vacía es un error de despliegue común. No
      // puede convertirse en una allowlist vacía que rechace todo, ni en un
      // `['']` que no matchee nunca: se trata como "sin allowlist".
      process.env.RIPLANTA_CORS_ORIGINS = '   ';
      expect(corsOriginsPermitidos()).toBe(true);

      process.env.RIPLANTA_CORS_ORIGINS = '';
      expect(corsOriginsPermitidos()).toBe(true);
    });

    it('descarta entradas vacías entre comas', () => {
      process.env.RIPLANTA_CORS_ORIGINS =
        'https://riplanta.example,,  ,https://otro.example';

      expect(corsOriginsPermitidos()).toEqual([
        'https://riplanta.example',
        'https://otro.example',
      ]);
    });
  });
});
