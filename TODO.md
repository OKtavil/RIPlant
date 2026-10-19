# R.I.Planta — Ruta de aprendizaje y trabajo

Guía de la implementación. Cada `☐` es un paso **verificable**: no lo marques
sin haber observado el resultado. El orden importa; cada paso asume el anterior.

> **Regla de esta ruta:** Fase 1 se construye **sin base de datos**, con datos en
> memoria. Eso es deliberado. Vas a sentir el problema que la arquitectura
> hexagonal resuelve en el Paso 2 — si metés Mongo ahora, no sentís nada.

---

## Fases (vista alta)

- [x] **Fase 0 — Entorno**: pnpm workspace, docker-compose con MongoDB 7
- [ ] **Fase 1 — Backend base**: NestJS típico, CRUD en memoria *(en curso)*
- [ ] **Fase 2 — Persistencia**: conexión a Mongo, colecciones, índices, seeds
- [ ] **Fase 3 — Usuarios y seguridad**: registro, login, guards, rol admin
- [ ] **Fase 4 — Interacción**: coronas, comentarios, rankings con contadores
- [ ] **Fase 5 — Frontend**: pantallas del prototipo en React + Vite
- [ ] **Fase 6 — Tests**: endpoints y lógica clave
- [ ] **Paso 2 — Refactor hexagonal**: dominio / aplicación / infraestructura

---

## Fundamentos — leelos antes de tocar Fase 1

### A. Los services

**Qué es**: la clase donde vive la lógica de tu app. Se marca con `@Injectable()`
y no sabe nada de HTTP — ni de `@Req`, ni de `@Res`, ni de códigos de estado.

**Anatomía mínima**:

```
@Injectable()
export class CategoriasService {
  private readonly categorias: Categoria[] = [];   ← estado en memoria

  findAll(): Categoria[] { ... }                    ← consulta
  create(dto: CreateCategoriaDTO): Categoria { ... }← escritura
}
```

**Las tres reglas que definen un buen service**:

1. **No conoce HTTP.** Si escribís `throw new NotFoundException()` está bien
   (es un error de Nest, pero semántico). Si escribís `res.status(404)` está mal.
2. **El estado vive como propiedad de la clase**, no como variable suelta dentro
   de un método. Nest instancia cada service **una sola vez** (singleton) y lo
   comparte entre todos los requests. Una variable local se pierde en cada llamada.
3. **Una responsabilidad por método.** Si `create` empieza a tener 40 líneas,
   es que hay dos cosas ahí.

**Cómo se inyecta**: el controller lo pide por `constructor`. Nest resuelve el
grafo de dependencias al arrancar — el controller no lo construye, no lo importa
a mano, **lo recibe**. Por eso `private readonly` en el parámetro: `readonly`
porque no se reasigna, `private` porque nadie afuera debe tocarlo.

**Dónde va en el futuro (Paso 2)**: hoy el service concentra todo. En hexagonal
se parte en *caso de uso* (orquesta) + *repositorio* (persiste). El service de
Nest pasa a ser solo el adaptador de entrada. Anotalo: es la comparación que va
a hacer que el refactor te signifique algo.

### B. Jest en Nest

**La pieza que casi nadie entiende al principio**: `TestingModule` es un
**contenedor de inyección de dependencias aislado**, independiente del de la app.
No arranca tu servidor, no lee `main.ts`, no registra tus pipes globales.

Eso tiene dos consecuencias directas:

1. **Si tu controller inyecta un service, el spec debe declararlo.** Si no,
   Jest ni siquiera compila la suite.
2. **Tu `ValidationPipe` global no existe en el test.** Hay que aplicarlo
   explícitamente sobre el `TestingModule`, o el test pasa con un DTO que no
   valida — el **falso positivo más común de Nest**.

**Anatomía de un spec**:

```
describe('CategoriasController', () => {          ← agrupa
  let controller: CategoriasController;

  beforeEach(async () => {                        ← se corre ANTES de cada it
    const module = await Test.createTestingModule({
      controllers: [CategoriasController],
      providers: [CategoriasService],             ← ESTO es lo que faltaba
    }).compile();
    controller = module.get(CategoriasController);
  });

  it('debería estar definido', () => {            ← un caso concreto
    expect(controller).toBeDefined();             ← aserción
  });
});
```

**Matchers que vas a usar todo el tiempo**:

| Matcher | Para qué |
|---|---|
| `expect(x).toBe(y)` | igualdad estricta (primitivos) |
| `expect(x).toEqual(y)` | igualdad profunda (objetos) |
| `expect(x).toHaveLength(n)` | largo de arrays y strings |
| `expect(fn).toThrow()` | que lanza error |
| `expect(x).toBeUndefined()` | que no devuelve nada |

**El nivel donde testeás importa más que el test**:

| Nivel | Qué monta | Velocidad | Sirve para |
|---|---|---|---|
| **Unidad** | solo la clase | instantáneo | reglas puras del negocio |
| **Módulo** | `TestingModule` | rápido | inyección y orquestación |
| **HTTP** (`supertest`) | el módulo + request real | lento | el contrato completo: rutas, pipes, códigos de estado |

Para **probar un pipe**, necesitás el nivel **HTTP**: sin un request real, el
pipe no se ejecuta.

---

## Fase 1 en detalle — Backend base

### 📍 Estado actual

| | Estado |
|---|---|
| `build` | ✅ limpio |
| `lint` | ✅ exit 0 — pero **1 warning**: `controller` sin usar en el e2e |
| `test` | ✅ 5 suites / **11 tests** |
| `test:e2e` | ✅ 2 suites / **10 tests** |
| `runtime` | ✅ verificado en vivo con `curl`: `{nombre:123}`, `{nombre:true}`, `{nombre:{}}` y `{nombre:"   "}` → `400`; uno válido → `201`; y **ningún registro basura en el `GET`** |

> 📦 **Estado git** — rama `master`. Las señales se verificaron **antes y
> después** de commitear:
> - `17b0fb4` `fix(categorias): reject blank names and non-string input in validation`
>   — el pipe compartido, el DTO, y los tests (unidad + e2e) que lo prueban.
>   Comportamiento y sus pruebas van juntos: separarlos deja el fix sin bisagra.
> - `4501821` `docs: add language and vocabulary conventions with domain glossary`
>   — la sección del README con las 4 reglas y el glosario.
>
> `TODO.md` estaba fuera de los commits; pasó a quedar trackeado en el commit
> que lo agrega. Los mensajes usan Conventional Commits con sujeto en inglés y
> scope en español — que es la regla 3 del README aplicándose a sí misma.

> ⚠️ **Son cuatro señales, no tres.** `build` (tipos), `lint` (estilo),
> `test` (comportamiento), `curl`/runtime (realidad). El `tsconfig` tiene
> `"isolatedModules": true`, lo que deja a ts-jest en modo *transpile-only*: sin
> chequeo semántico de tipos. Ya se observó **`build` ✅ + `lint` ✅ + `test` ✅
> con la app muerta**. Ninguna herramienta estática reemplaza levantar el server.

> 🎯 **Verde no significa "la respuesta es útil".** Con `test:e2e` en **10/10**,
> `POST {"nombre":123}` devuelve **cuatro** mensajes y **tres son mentiras**:
> *"no debe contener solo espacios en blanco"*, *"como máximo 20 caracteres"* y
> *"al menos 3 caracteres"* — las tres asumen un string. El verdadero (*"debe ser
> una cadena de texto"*) va **último**, y el orden del array no significa nada.
> Tu test pasa igual porque usa `toContain(...)`: busca la aguja y se traga las
> mentiras. **El test es honesto; lo que está roto es la respuesta.** → deuda 10.

> 🎯 **Ninguna cantidad de tests verdes reemplaza una aserción real.** La única
> pregunta que importa es **"si borro la implementación, ¿este test se pone
> rojo?"**. Pero ojo con el otro extremo: **un test que pasa porque copiaste el
> valor que devolvió el código tampoco prueba nada**. El rojo dice *qué hace* el
> código; vos decidís si eso es lo que *debería* hacer.

Deuda abierta:

1. ✅ **id duplicado** y **`.find()` por nombre** — corregidos y probados.
2. 🟡 **`findAll()` sin copia** — devuelve `ReadonlyArray<Categoria>` (protección
   en compilación, sin costo de copia). **Cuidado al testear: capturá `.length`,
   nunca el array** — el array es la referencia viva y tu aserción no puede fallar.
3. ✅ **Resuelto — nombres de solo espacios.** `@Matches(/\S/)` en el **DTO**,
   lo que además cierra la decisión de diseño que estaba abierta (DTO o
   service → **DTO**). Verificado en vivo: `{"nombre":"   "}` → `400`.
4. ✅ **Corregido: el espejo del `create`.** Ahora `mockReturnValue(createdCategoria)`
   y `toEqual(createdCategoria)`, planos, coincidiendo con lo que devuelve el
   service. El test dejó de afirmar una ficción.
5. ✅ **Resuelto — las 5 aserciones inventadas del e2e.** Ahora coinciden con el
   DTO y las 10 pruebas pasan. **La dirección fue la correcta: se arregló la
   aserción para que coincida con la spec.** En la ronda anterior se había hecho
   al revés — se tradujeron los mensajes del DTO al inglés para que entraran en
   el test. Arreglar el código para que encaje con la aserción es la forma más
   rápida de tener tests verdes y un producto mal.
6. ✅ **Resuelto — el caso de `forbidNonWhitelisted`.**
   `should return 400 if body contain other properties` agregado y pasando:
   `{"nombre":"Plantas","rol":"admin"}` → `400` *"property rol should not exist"*.
7. ✅ **Resuelto — `create()` ahora tiene 3 tests**: devuelve la categoría
   creada, incrementa el largo del array, y `should assign an incremented id`
   pincha directamente la colisión del contador (el bug original). Ahí vivieron
   los tres bugs de la ronda 1 y hoy estaban sin cobertura.
8. ✅ **Corregido en esta ronda — la estructura del e2e está bien:** app real,
   **service real sin mock**, `applyValidationPipe`, `init()`, `afterEach` +
   `close()`, y **`const antes = service.findAll().length`** (número, no la
   referencia: la trampa evitada). `toMatchObject` con `expect.any(Number)`
   también es el uso correcto para un id que genera el server.
9. ✅ **Corregido antes:** `validation-pipe.ts` (`INestApplication`, retorno
   `void`, línea muerta eliminada) · mock adentro del `beforeEach` ·
   `Create` → `create` · aserción de `findAll` en el service con forma completa.
10. 🟡 **Los mensajes de error no son estructurados — y ensucian la respuesta.**
    **Decisión tomada: Camino B — `exceptionFactory`.** *(se descartó el nativo
    `errorFormat: 'grouped'`; el porqué, abajo)*

    **El problema.** El caso más común ya miente: `POST {}` arranca con
    *"no debe contener solo espacios en blanco"*. Y `POST {"nombre":123}`
    devuelve **cuatro mensajes, tres mentiras**:
    ```
    "El nombre de la categoría no debe contener solo espacios en blanco"  ← falso
    "El nombre de la categoría debe tener como máximo 20 caracteres"      ← falso
    "El nombre de la categoría debe tener al menos 3 caracteres"          ← falso
    "El nombre de la categoría debe ser una cadena de texto"              ← EL VERDADERO
    ```
    Causa: `@MinLength`, `@MaxLength` y `@Matches` son validadores
    **solo-string**; ante un non-string no dicen *"no aplica"*, dicen **"falló"**.
    Y el orden del array sale **inverso** al de los decoradores: no significa
    nada, no se puede confiar en que la primera posición sea la causa.

    **Por qué no `errorFormat: 'grouped'`.** Es nativo de Nest 12 y cambia
    `message` de `string[]` a `Record<campo, string[]>` en una línea. Resuelve
    **el campo**, pero **no da el código**: los valores siguen siendo prosa,
    acoplada al idioma, y las tres mentiras siguen ahí — solo que ahora
    ordenadas bajo el campo correcto. Arreglaría la mitad y habría que
    reescribirlo igual.

    **La anatomía, verificada en las dependencias instaladas.**
    `validation.pipe.js` hace `throw await this.exceptionFactory(errors)`, y la
    opción es `exceptionFactory?: (errors: ValidationError[]) => any`. Cada
    `ValidationError` trae:
    ```
    property: string                      ← el campo
    value?: any                           ← lo que mandaste
    constraints?: Record<string, string>  ← { código: mensaje }
    children?: ValidationError[]          ← campos anidados
    ```
    **Las claves de `constraints` son los nombres de los validadores** —
    `isString`, `isNotEmpty`, `minLength`, `maxLength`, `matches`. **El código
    que hace falta ya existe: no se inventa, se deja de descartar.**
    Y la violación de `whitelist` también es un constraint más
    (`ValidationTypes.WHITELIST = 'whitelistValidation'`), así que
    *"property rol should not exist"* pasa por la misma fábrica **sin código
    especial**.

    **El principio que lo sostiene.** El backend emite **hechos**; el frontend
    decide **prioridad**. Que `minLength` falle sobre `123` es verdadero — esa
    restricción no pasó. Lo falso era la frase *"debe tener al menos 3
    caracteres"*, que es una afirmación sobre **lo que el usuario escribió**, y
    sobre eso el validador no opina. Que React muestre `isString` y se calle
    `minLength` es una decisión de UI, y va donde vive la UI.

    **Tres preguntas que hay que responder al escribir.**
    1. `constraints` es un `Record` — ¿cómo se aplana a **una entrada por
       clave**?
    2. ¿Qué envelope se devuelve? ¿Se mantiene `message` en español como ayuda
       de desarrollo, se agrega `errors`, o ambos?
    3. ¿Qué pasa con `children` cuando un DTO se anida algún día?

    **Verificación.** Orden test-first: primero el **rojo** (test apuntando al
    shape nuevo; hoy falla porque no existe `errors`), después la implementación.
    El cierre: `POST {"nombre":123}` trae exactamente **una** entrada
    `{ campo: 'nombre', codigo: 'isString' }`, y el `POST {}` deja de arrancar
    con el mensaje de espacios.
    **Ya verificado como correcto:** los `message:` en español del
    `CreateCategoriaDTO` quedaron como **ayuda de desarrollo**, y los que genera
    el framework siguen en inglés — que es lo que la regla 2 pide.
11. ✅ **Corregido — `@IsString()` era una regla inalcanzable.** Durante un rato
    hubo `enableImplicitConversion: true` en el pipe. Esa opción convierte el
    valor al tipo reflejado **antes** de que class-validator lo mire, así que el
    validador de tipo no puede fallar: no existe. Verificado en vivo **antes**
    del arreglo:
    ```
    POST {"nombre":123}  → 201  {"nombre":"123"}
    POST {"nombre":true} → 201  {"nombre":"true"}
    POST {"nombre":{}}   → 201  {"nombre":"[object Object]"}
    ```
    Se llegó a crear una categoría llamada literalmente `[object Object]`:
    datos basura aceptados con `201`. **La quinta vez en la sesión que
    `build` ✅ + `lint` ✅ + `test` ✅ con un defecto real adentro** — y esta vez
    lo atrapó un test escrito a propósito, no una revisión.
    *Regla*: la conversión de tipos se hace **explícita y por campo**
    (`@Type(() => Number)`), nunca implícita y global. Lo que es silencioso no se
    controla.
12. ✅ **Resuelto — la deuda menor.** `controller` eliminado (el `lint` quedó
    **sin avisos**), typos corregidos (`'array'`, `'should'`), y el caso
    *"too long"* pasó a `'a'.repeat(21)`.
    **El off-by-one merece anotarse**: `@MaxLength(20)` es **incluyente** — 20
    caracteres es legal. Verificado en vivo:
    ```
    repeat(20) -> 201  {"nombre":"aaaaaaaaaaaaaaaaaaaa"}
    repeat(21) -> 400  "debe tener como máximo 20 caracteres"
    ```
    Tercera vez con la misma raíz: se escribió el número que estaba en la cabeza
    en vez del que exige el borde. **El borde se razona**, no se recuerda:
    *"como máximo 20"* ⇒ 20 pasa, 21 rompe.

### Etapa 1A — Categorías (CRUD completo)

#### Paso 1 — Cerrar el contrato del DTO ✅

- **Objetivo**: campo `nombre`, largo máximo 20, coincidente con el README.
- **Qué aprendés**: un DTO es un *contrato de forma*; un contrato que se
  contradice a sí mismo rompe el sistema entero.
- **Estado**: hecho y verificado.

#### Paso 2 — Registrar el `ValidationPipe` global ✅

- **Objetivo**: en `main.ts`, aplicar el pipe a **todos** los endpoints.
- **⚠️ Detalle de forma**: `enableImplicitConversion` **no va en el nivel raíz**
  del objeto. Va **anidado** dentro de `transformOptions`. Son dos niveles
  distintos porque una opción es del pipe y la otra es de la transformación.
- **Qué aprendés**: qué hace un pipe, por qué **global** y no por ruta (olvidar
  uno es silencioso), y que Nest solo *orquesta* — valida `class-validator` y
  transforma `class-transformer`.
- **Verificación**: un `POST` con body inválido devuelve `400` con **tus**
  mensajes en español.

#### Paso 3 — Arreglar el spec del controller ✅

- **Objetivo**: que `categorias.controller.spec.ts` compile y corra.
- **Qué aprender**: ver **Fundamentos B** — el `TestingModule` necesita
  `providers: [CategoriasService]` porque el controller ahora lo inyecta.
- **Lección**: el scaffolder de Nest genera un spec **antes** de que existan
  dependencias. El día que inyectás algo, ese spec se rompe. No es un bug tuyo.
- **Verificación**: `pnpm --filter backend run test` sin suites fallando.

#### Paso 4 — `findAll()` y `create()` en el service ✅ *(con deuda: ver 📍 Estado actual)*

- **Objetivo**: los dos métodos, con estado en memoria (un array como propiedad
  de la clase). Ver **Fundamentos A**.
- **Qué aprendés**: estado en memoria, por qué `private readonly` en el
  constructor del controller, y que el service no sabe de HTTP.
- **Verificación**: `build` limpio + `curl` que devuelve `201` en el `POST`.

#### Paso 5 — Test RED de la validación ✅

- **Objetivo**: test que mande un body inválido y espere `400`.
- **Qué aprendés**: que el `TestingModule` **no hereda tu pipe global**, y cómo
  aplicárselo. Es el falso positivo más caro de Nest.
- **Verificación**: el test pasa con el pipe aplicado y **falla sin él**.
- **Estado**: hecho y verificado con **ambas** corridas observadas.
  - **Sin** pipe → **7 fallan / 3 pasan**: solo sobreviven `GET` y `create`,
    que no dependen de validación. Ese es el resultado que el paso pedía:
    prueba de que el `TestingModule` no registra tu pipe.
  - **Con** pipe → **10/10**, y además verificado en vivo con `curl` sobre 8
    casos (válido, vacío, número, corto, borde de 21, solo espacios,
    propiedad extra).
  - **Lección**: una verificación termina **restaurada**. En la ronda anterior
    el experimento quedó sin descomentar y el e2e cayó a 7/3 por esa sola
    razón, sin ningún bug real de por medio.

#### Paso 6 — Unicidad del nombre

- **Objetivo**: rechazar un nombre duplicado.
- **Qué aprendés**: **la diferencia entre validación de forma y regla de
  negocio.** El pipe valida la forma; la unicidad es negocio y vive en el
  service.
- **Verificación**: dos `POST` con el mismo nombre → el segundo falla.

#### Paso 7 — `GET /categorias/:id`

- **Objetivo**: detalle. `404` cuando no existe.
- **Qué aprendés**: `@Param`, y el contrato de errores de una API.
- **Verificación**: test de `404` + `curl`.

#### Paso 8 — `PUT /categorias/:id`

- **Objetivo**: renombrar. Si el nuevo nombre ya existe → error.
- **Qué aprendés**: reutilizar la regla del Paso 6 en vez de duplicarla. Cuando
  dos endpoints necesitan la misma regla, es una pista de dónde va el código
  compartido.
- **Verificación**: test de renombre + test de duplicado + `curl`.

#### Paso 9 — `DELETE /categorias/:id` y la decisión #8 del README

- **⚠️ Decisión pendiente**: si hay lápidas usando la categoría, ¿impedir el
  borrado o quitarla de esas lápidas? **Hay que elegir antes de escribir.**
- **Qué aprendés**: un CRUD no termina en los cuatro verbos, termina en las
  *consecuencias* de cada uno.
- **Verificación**: test que cubra el caso "en uso", además del borrado simple.

#### Paso 10 — Dejar decidida la regla de admin (#9)

- **Objetivo**: sin implementar nada — solo cerrar la decisión. Se implementa en
  **Fase 3**, con guards.
- **Verificación**: decisión escrita en el README.

### Etapa 1B — Lápidas

- [ ] **Paso 11 — `POST /lapidas`** con todos los campos del documento propuesto
- [ ] **Paso 12 — `GET /lapidas`** (el cementerio) y **`GET /lapidas/:id`**
- [ ] **Paso 13 — `PUT /lapidas/:id`** y **`DELETE /lapidas/:id`**
- [ ] **Paso 14 — La relación lápida ↔ categoría**: decidir si el prototipo
      permite **una** o **varias** categorías (decisión #3) antes de escribir

---

## Comandos de verificación

| Qué | Comando |
|---|---|
| Tipos + build | `pnpm --filter backend run build` |
| Lint | `pnpm --filter backend run lint` |
| Tests | `pnpm --filter backend run test` |
| Tests e2e | `pnpm --filter backend run test:e2e` |
| Un solo test | `pnpm --filter backend run test -- src/categorias/categorias.controller.spec.ts` |
| Servidor con watch | `pnpm --filter backend run start:dev` |

Prueba manual:

```bash
curl -i -X POST http://localhost:3000/categorias \
  -H "Content-Type: application/json" \
  -d '{"nombre": "ab"}'
```

Esperado con el pipe registrado: `400` y tus mensajes en español.
Si devuelve `201`, el pipe no está haciendo su trabajo.

---

## Decisiones abiertas (del README)

| # | Tema | ¿Dónde se resuelve? |
|---|------|---------------------|
| 2 | Causa de muerte falta en el form | Etapa 1B |
| 3 | Una o varias categorías | Paso 14 |
| 5 | Insignia Zombie (falta estado) | Fase 4 |
| 8 | Borrar categoría en uso | Paso 9 |
| 9 | ¿Solo admin administra categorías? | Paso 10 (decidir) / Fase 3 (implementar) |
| 1 | Dónde se guarda la foto | Fase 2 |
