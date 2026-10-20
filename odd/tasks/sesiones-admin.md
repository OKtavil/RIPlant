# Feature: sesiones y autorización de categorías

Objetivo: manejo de sesiones en el backend (login, cookie httpOnly, logout) y
protección del CRUD de categorías para que solo un administrador pueda
crear/editar/borrar. Implementación con middlewares, como pidió el usuario.

Rama: `copilot/working-copy`. Runner: `pnpm --filter backend run ...`.

## Specs

- **S1** — `POST /sesiones` recibe `{ username, password }`, valida contra la
  colección `usuarios` (hash bcrypt) y devuelve `201` con la sesión. Credenciales
  inválidas → `401` con mensaje técnico.
- **S2** — La sesión se entrega como **cookie httpOnly** (`riplanta_sesion`)
  con `SameSite=Lax`, `Path=/` y `Secure` en producción. El valor de la cookie
  es un token opaco aleatorio de 32 bytes; en la base solo se guarda su hash
  SHA-256, nunca el token en claro.
- **S3** — `GET /sesiones/actual` devuelve la sesión vigente (`401` si no hay).
  `DELETE /sesiones` cierra la sesión (`204`) y borra el registro de la base.
- **S4** — La sesión expira (TTL configurable por `SESION_TTL_HORAS`, default 8).
  El índice TTL de Mongo limpia los documentos vencidos; el servicio también
  verifica `expiraEn` al resolver, porque el TTL de Mongo corre cada 60s.
- **S5** — `SesionesMiddleware` (global, `forRoutes('*')`) resuelve la cookie y
  adjunta `req.sesion` o la deja `undefined`. No modifica la respuesta.
- **S6** — `AdminMiddleware` se aplica **solo** a `POST /categorias`,
  `PUT /categorias/:id` y `DELETE /categorias/:id`. Sin sesión → `401`; con
  sesión de rol `usuario` → `403`; con rol `admin` → `next()`.
- **S7** — `GET /categorias` y todos los endpoints de `lapidas` siguen siendo
  públicos y sin cambios de comportamiento.
- **S8** — El usuario administrador se siembra al arrancar (upsert por
  `username`). Credenciales por env (`ADMIN_USERNAME`/`ADMIN_PASSWORD`); en
  desarrollo usa un default documentado y **loguea un aviso**; en producción
  (`NODE_ENV=production`) sin `ADMIN_PASSWORD` no siembra y loguea un error.
- **S9** — La respuesta de sesión incluye `{ id, username, rol }` del usuario.
  El `passwordHash` nunca sale en ninguna respuesta.
- **S10** — Documentación: contrato de `/sesiones`, roles, cookie, env vars, y
  cómo probarlo con curl (incluida la lectura de la cookie del header).
- **S11** — El login frena la fuerza bruta con un contador **en memoria** por
  origen (`ip|usuario`): tras 5 fallos responde `429` con el mensaje
  «Demasiados intentos de inicio de sesión. Probá de nuevo en unos minutos.» sin
  gastar otra comparación bcrypt; la ventana es de 15 minutos y un login exitoso
  reinicia el contador. Además hay un tope global de 8 comparaciones bcrypt
  simultáneas, porque bcryptjs cuesta ~50ms de CPU por hash y un flood satura el
  event loop. Un origen (IP) distinto no hereda el bloqueo. Límite conocido: al
  ser en memoria, con varias instancias hace falta un almacén compartido
  (Redis).
- **S12** — Una cookie `riplanta_sesion` con percent-encoding inválido (por
  ejemplo `%E0%A4%A`) **no rompe el request**: `leerCookie` la trata como
  ausente. Las rutas públicas siguen respondiendo normal y las que requieren
  sesión responden `401`, nunca `500`. Un valor así no puede ser un token
  nuestro: los tokens son base64url y nunca necesitan decodificarse.

## Tasks

- [x] T1 — Escribir este documento y el espejo en Engram. *(inline)*
- [x] T2 — RED: specs de `password`, middlewares, `SesionesService` y e2e de
      `/sesiones` + protecciones de `/categorias`. *(inline)*
- [x] T3 — `usuarios`: schema, service con bcrypt y siembra del admin.
      *(inline)*
- [x] T4 — `sesiones`: schema con índice TTL, service, controller, DTO,
      middleware y helper de cookie. *(inline)*
- [x] T5 — `AdminMiddleware` + wiring en `AppModule`/`CategoriasModule` y CORS
      con credenciales. *(inline)*
- [x] T6 — GREEN: hacer pasar unit + e2e. *(inline)*
- [x] T7 — Verificación: build, lint, test, test:e2e, y curl en vivo contra un
      server real en el puerto 3215. *(inline)*
- [x] T8 — Docs: README, spec, architecture, TODO. *(inline)*
- [x] T9 — Commit de la unidad de trabajo: `1ae7143`. *(inline)*
- [x] T10 — Corrección acotada del hallazgo `R4-LOGIN-NO-THROTTLE` (límite de
      intentos + 429 + tope de bcrypt simultáneos): S11, más tests unitarios y
      e2e. Commit: `d3c79e9`. *(inline, corrección nativa)*
- [x] T11 — Commit de la documentación de T10 (este documento y el espejo en
      Engram): quedó fuera del commit de la corrección para respetar su
      presupuesto de líneas; se commitea después del cierre de la review (L14).
      *(inline)*
- [x] T12 — Corregir `R3-cookie-malformed` (S12): `leerCookie` no debe lanzar con
      un valor que no se puede decodificar. Commit: `291625b`. *(inline)*

Riesgo: **item 2 (seguridad: autenticación, permisos, credenciales)** y
**item 5 (dependencia nueva: bcryptjs)**. Requiere verificación independiente.

## Log

- **L1** — Usuario, 2026-10-19: "Esta rama es para que tu completes el proyecto,
  para empezar puedes implementar el manejo de sesiones en el backend? de manera
  que solo un administrador pueda cambiar categorias? y recuerda utilizar un
  middleware".
- **L2** — Sesión server-side (Mongo) elegida sobre JWT: permite cerrar sesión de
  verdad (revocación) y el TTL de Mongo es una buena lección. JWT stateless no
  se puede revocar sin una tabla negra, que es exactamente esto con otro nombre.
- **L3** — `bcryptjs` en vez de `bcrypt`: el nativo requiere toolchain de
  compilación en cada máquina, y el usuario trabaja desde dos computadoras.
  `bcryptjs` es JS puro, mismo formato `$2b$`, cero dependencias. Tradeoff:
  ~10x más lento en hashing; con rounds=10 es ~50ms por hash, irrelevante aquí.
- **L4** — El `usuarioId` de la sesión es el `_id` de Mongo, no un id numérico
  inventado. Así se evita reintroducir la carrera de `max+1` que ya se arregló
  en categorías.
- **L5** — El orden de los middlewares importa y no es casualidad: `SesionesMiddleware`
  se registra en `AppModule` (raíz) y `AdminMiddleware` en `CategoriasModule` (un
  nivel más abajo). Nest ordena por distancia al módulo raíz, así que la
  resolución de sesión corre primero. `AdminMiddleware` **no** resuelve la sesión
  por su cuenta: depende de `req.sesion`. Los e2e prueban el orden real de punta
  a punta (login → mutación con `201`, sin cookie → `401`), en vez de asumirlo.
- **L6** — Los e2e existentes de categorías usan `POST`/`PUT`/`DELETE` sin
  autenticación; al añadir `AdminMiddleware` pasan a `401` y hay que actualizarlos
  para loguearse primero. Es un cambio de comportamiento esperado y pedido.
- **L7** — Evidencia RED: primera corrida con 4 suites sin poder resolverse
  (`Cannot find module './sesiones.service'`). Evidencia GREEN: unit 35/35,
  e2e 16/16, build OK, lint solo con los 2 avisos preexistentes de
  `lapidas.service.ts`.
- **L8** — Un aviso del log mentía: decía «contraseña por defecto» aunque
  `ADMIN_PASSWORD` viniera del entorno. Lo detectó la corrida en vivo, no los
  tests. Corregido para que el aviso dependa de si se usó el default, y se
  agregó `usuarios.service.spec.ts` para fijarlo.
- **L9** — Verificación en vivo (puerto 3215): `401` sin sesión, `401` con
  contraseña mala, `201` + `Set-Cookie: HttpOnly; SameSite=Lax` al loguearse,
  `200` en `/sesiones/actual`, `201` creando categoría como admin, `200` en
  `GET /categorias` sin cookie, `204` al cerrar y `401` reusando la cookie.
  En Mongo se comprobó 0 coincidencias con el token en claro y 1 con su SHA-256.
- **L10** — `backend/.env.example` no se pudo editar: el permiso del agente
  rechaza archivos `.env.*`. No se esquivó por shell. Las variables quedaron
  documentadas en el README; el archivo de ejemplo sigue sin ellas y hay que
  agregarlas a mano (o ajustar el permiso).
- **L11** — Review nativa (`--committed-only`, base `1c835001`, candidate
  `1ae7143`): 4 lentes (risk, resilience, readability, reliability). Dos
  CRITICAL de resilience (`R4-SESSION-MW-NO-FAILURE-ISOLATION` y
  `R4-LOGIN-NO-THROTTLE`) fueron refutados por el refuter, pero Go igual pidió
  una corrección. El plan de corrección admitió **solo**
  `R4-LOGIN-NO-THROTTLE` y congeló el pronóstico de 150 líneas
  (`correction_budget` 200, política `floor_two`).
- **L12** — Evidencia de la corrección (S11). RED: con el `sesiones.service.ts`
  previo, `sesiones.service.spec.ts` da 2 fallos (los que afirman el `429` y el
  tope de comparaciones simultáneas) y 11 verdes. GREEN: unit 39/39, e2e 17/17,
  build OK, lint solo con los 2 avisos preexistentes de `lapidas.service.ts`. La
  prueba e2e golpea HTTP real: 5 intentos con contraseña mala → `401`, el sexto
  → `429`.
- **L13** — El pronóstico de 150 líneas quedó chico: la corrección real mide 190
  líneas cambiadas (174 altas / 16 bajas) dentro del `correction_budget` de 200.
  Para no pasarse del tope, la edición de este documento (S11/T10/T11/L11-L13)
  queda **sin commitear** durante la corrección: la review es `--committed-only`,
  así que solo cuenta lo commiteado, y el commit de docs se hace después del
  cierre. Decisión de diseño: se mantiene el tope global de bcrypt simultáneos
  porque el hallazgo dice «un solo cliente puede saturar el event loop», y un
  bloqueo solo por `ip|usuario` no cubre a quien rota usuarios.
- **L14** — Cierre de la review nativa. La corrección `d3c79e9` (190 líneas, tope
  200) fue admitida: el validador apuntado corrió sobre los árboles congelados y
  devolvió `approved`. El acknowledgement exacto consumió la autoridad
  (`target_identity` `sha256:1065b807…d3977`, revisión consumida
  `sha256:a463a534…1619b4`, `authority: burned`). A partir de ahí el ciclo de
  review termina: commit, push, PR y release vuelven a ser decisiones humanas
  bajo la política normal del repo. Este commit de docs es un delta pasivo y no
  abre otra review.
- **L15** — Hallazgos **no bloqueantes** que dejó la review (los CRITICAL
  `R4-SESSION-MW-NO-FAILURE-ISOLATION` y `R4-LOGIN-NO-THROTTLE` quedaron
  refutados o corregidos; `R4-LOGIN-NO-THROTTLE` es el que se corrigió en
  `d3c79e9`). Quedan como trabajo posterior, no como motivo para repetir la
  review de este candidato: `R1-001` (`usuarios.service.ts:34`),
  `R1-002` (`main.ts:10`), `R1-003` (`sesiones.controller.ts:27-38`),
  `R2-002` (`usuario.schema.ts:16`), `R2-003` (`iniciar-sesion.dto.ts:6`),
  `R2-004` (`sesiones.controller.ts:61-63`), `R2-005`
  (`docs/architecture.md:30-31`), `R3-authz-put-delete` y `R3-e2e-shared-db`
  (tests e2e comparten base de datos), `R3-cookie-malformed`
  (`cookie.ts:41`, `decodeURIComponent` sin proteger), `R3-env-leak`,
  `R3-null-hash-path` (`password.ts:31`), `R4-AUTH-OBSERVABILITY-GAP` y
  `R4-LOGOUT-COOKIE-AFTER-DB`. `R2-001` y `R3-doc-resilience` (el texto viejo de
  L5) ya quedaron resueltos en este mismo commit de docs.

  **Estado al 2026-10-20 (ver L20, L21):** cerrados `R3-e2e-shared-db` (`1888293`),
  `R3-null-hash-path` (`391171f`) y los dos `R4` (`e99831b`). **Obsoletos** al
  re-derivar desde el código actual: `R1-001`, `R2-002`, `R2-004`,
  `R3-authz-put-delete`. **Vivos** (ninguno urgente): `R1-002` y `R1-003` son
  **decisiones de despliegue**, no fixes; `R2-003` es endurecimiento local menor;
  `R2-005` es una ruta desactualizada en un doc. `R3-env-leak` es **no
  determinable y sin evidencia de fuga**. Detalle y evidencia en L21.
- **L16** — Usuario, 2026-10-19: "ataca r3". Es `R3-cookie-malformed`
  (`cookie.ts:41`): `decodeURIComponent` sin proteger. Un valor con
  percent-encoding inválido lanza `URIError` dentro de `leerCookie`, que es un
  helper compartido por `SesionesMiddleware` (toda ruta) y `DELETE /sesiones`;
  el resultado es un `500` en cualquier request que traiga la cookie rota,
  incluso en rutas públicas. La corrección es tratarlo como cookie ausente
  (fail-closed: sin sesión), no adivinar el token.
- **L17** — Evidencia de T12 (S12). RED: unit `sesiones.middleware.spec.ts` con
  `URIError: URI malformed` en `cookie.ts:41`; e2e real `expected 200 "OK", got
  500 "Internal Server Error"` en `GET /categorias` con `Cookie:
  riplanta_sesion=%E0%A4%A`. GREEN: unit 40/40, e2e 18/18, build OK, lint solo
  con los 2 avisos preexistentes de `lapidas.service.ts`. Chequeo diferencial
  contra el commit base (copia en `mktemp -d`, no commiteada): 16 casos de
  entrada, 13 idénticos, y las 3 diferencias son exactamente los valores con
  percent-encoding inválido (`%`, `%E0%A4%A`, `%ZZ`), donde antes lanzaba y ahora
  devuelve `undefined`. Ninguna diferencia en los casos válidos.
- **L18** — Assessment de RDD sobre el slice desde la última frontera revisada
  (`d3c79e9`, la que quedó aceptada en L14): `risk: medium`,
  `review_due: false`, `review_due_reason: under_budget` (142 líneas cambiadas
  en 4 archivos; el único `executable_change` señalado es `cookie.ts`). Como la
  razón es `under_budget` y no `passive`, la frontera **no** avanza: este trabajo
  queda pendiente dentro del slice hasta que un commit posterior llegue al
  presupuesto de review. No se abrió ninguna review para `291625b`.
  Líneas pendientes acumuladas desde `d3c79e9`: 142.
- **L20** — Cierre de los dos hallazgos `R4` no bloqueantes (commit `e99831b`).
  El usuario, 2026-10-20: "segui" (después de "si" al assess y de que el assess
  diera `under_budget`). Se atacaron los dos con RED primero, verificado antes
  de escribir el fix.

  **`R4-LOGOUT-COOKIE-AFTER-DB`.** En `SesionesController.cerrar`, si
  `this.sesiones.cerrar(token)` lanzaba (Mongo caído, timeout), la excepción
  saltaba por encima de `borrarCookieSesion(res)` y la cookie quedaba **viva en
  el browser**: el usuario cree que cerró sesión y el próximo request sigue
  autenticado. RED real (e2e, `test/sesiones.e2e-spec.ts`): espía
  `SesionesService.cerrar` con `mockRejectedValueOnce`, y la respuesta no traía
  **ningún** `Set-Cookie` — `Received string: ""`. GREEN: el borrado en la base
  pasa a best-effort con `logger.warn`, y `borrarCookieSesion` corre siempre.
  Cerrar sesión del lado del cliente no puede depender de que la base responda.

  **`R4-AUTH-OBSERVABILITY-GAP`.** `SesionesMiddleware` es **global**
  (`forRoutes('*')` en `app.module.ts`) y llamaba a `this.sesiones.resolver(token)`
  sin protección. `resolver` hace **tres** llamadas a Mongo que pueden lanzar
  (`findOne`, `deleteOne`, `encontrarPorId`). La consecuencia medida no es que
  el usuario se desloguee en silencio — es **peor**: la excepción sube sin
  capturar y Nest la convierte en `500` en **toda la app**, incluidas las rutas
  públicas (`GET /lapidas`, `GET /categorias`), que no necesitan base para
  responder. RED real (unit, `sesiones.middleware.spec.ts`): con
  `resolver.mockRejectedValue`, la excepción `Mongo caído` salía del middleware y
  `next()` nunca corría. GREEN: se degrada a "sin sesión" (las rutas que la
  exigen dan `401`, las públicas siguen andando) y se **loguea la causa** — el
  modo de falla silencioso es justo lo que el hallazgo señala: sin log, un `401`
  masivo parece "los usuarios se desloguearon" cuando detrás hay una base caída.
  La cookie **no** se borra por esto: un fallo transitorio no invalida la sesión.

  **Un test que falló y enseñó.** El primer intento de fix agregaba un
  early-return `if (!token)` para no llamar a `resolver` sin cookie. Dos tests
  existentes fallaron: **fijaban que `resolver` se invoque siempre, incluso con
  `undefined`** (su primera línea ya maneja ese caso). Era una optimización mía
  que nadie pidió y rompía un contrato fijado; se revirtió en vez de justificarla.

  **Verificación observada:** unit **83/83** (eran 82; +1 del middleware) · e2e
  **32/32** (eran 31; +1 de la cookie) · `build` y `lint` limpios.

  **Slice RDD:** la frontera sigue en `20da1b9`. Con `e99831b` el slice acumula
  **3 commits y 619 líneas** (560 insertions + 59 deletions en 15 archivos), sin
  llegar al presupuesto: `under_budget` no es "ya revisado" y la frontera no
  avanza.

  **Pendientes que siguen abiertos** (de L15): `R1-001`, `R1-002`, `R1-003`,
  `R2-002`, `R2-003`, `R2-004`, `R2-005`, `R3-authz-put-delete`, `R3-env-leak`.
  **Límite conocido:** no hay informe de review guardado (la autoridad se consumió
  en L14); de los `R1`/`R2` solo queda nombre + número de línea, y esos números
  ya no coinciden con el código actual, así que reconstruir el hallazgo exige
  re-derivarlo desde el código, no leerlo de la nota.
- **L21** — Re-derivación de los hallazgos de `L15` **desde el código actual**
  (los números de línea de la nota ya no coincidían). No hay informe de review
  guardado: la autoridad se consumió en L14. Resultado, con evidencia:

  - `R1-001` (`usuarios.service.ts:34`) — **obsoleto.** Esa línea hoy es un
    docblock; al momento de la review era la firma de `siembraAdministrador`. El
    path de producción lee `ADMIN_PASSWORD` del entorno, `NODE_ENV=production`
    bloquea el fallback y la falta de la variable produce `logger.error` + `return`
    sin crear el admin. **No hay secreto hardcodeado en producción.**
  - `R2-002` (`usuario.schema.ts:16`) — **obsoleto.** El `enum` cubre los tres
    roles (`usuario`, `admin`, `zombie`); `zombie` "no autoriza nada" por decisión
    de dominio (D-008) y `DuenoOAdminLapidaMiddleware` lo trata como no-admin.
  - `R2-004` (`sesiones.controller.ts:61-63`) — **obsoleto.** Esas líneas hoy son
    el comentario de `R4-LOGOUT-COOKIE-AFTER-DB`, cerrado en `e99831b`.
  - `R3-authz-put-delete` — **obsoleto, verificado contra el backend corriendo.**
    `PUT` y `DELETE /lapidas/:id` están cerrados por `DuenoOAdminLapidaMiddleware`
    (`lapidas.module.ts:46-52`) y devuelven **401 real** sin sesión (probado con
    `curl`, no solo en tests). `usuarioId` y `autor` se estampan desde la sesión.
  - `R1-002` (`main.ts:16`) — **vivo, decisión de despliegue.** `origin: true` en
    CORS. Mitigado por `SameSite=Lax`, que ya corta el POST cross-site. En
    producción conviene allowlist explícita. **No es un fix de código.**
  - `R1-003` (`sesiones.controller.ts:40`) — **vivo, decisión de despliegue.**
    `req.ip` sin `app.set('trust proxy')`: detrás de un proxy, todos los clientes
    comparten la clave del rate-limit (5 fallos ajenos bloquean a todos con ese
    usuario). Depende de si se confía o no en el header del proxy.
  - `R2-003` (`iniciar-sesion.dto.ts:6`) — **vivo, endurecimiento local menor.**
    `" "` (espacio) pasa `@IsNotEmpty` y llega al servicio. El impacto real
    depende de que exista un `username` que normalice a `admin`, algo que el
    registro **no puede crear** (`trim: true` en el schema, línea 9). Arreglo:
    `@Matches(/\S/)` sobre `username`, igual que `create-categoria.dto.ts:22`.
  - `R2-005` (`docs/architecture.md:30-31`) — **vivo, menor.** El doc dice
    `App.tsx`; la ruta real es `frontend/src/app/App.tsx`. El contenido semántico
    del párrafo es correcto.
  - `R3-env-leak` — **no determinable, sin evidencia de fuga.** Sin línea ni
    código que coincida. Barrido completo de `process.env` / `import.meta.env`:
    ningún secreto se interpola en una respuesta. La única lectura frágil es
    `SESION_TTL_HORAS` leído por llamada (`sesiones.service.ts:64`), que hace el
    TTL mutable en runtime — consistencia de configuración, no fuga.

  **`usuarioId` en comentarios — ANALIZADO Y DESCARTADO COMO HALLAZGO.** Lo
  encontré al auditar (`GET /lapidas/:id/comentarios` es público y devuelve
  `usuarioId`), pero **no es una fuga**: `GET /lapidas` es público y ya expone el
  mismo id de cada dueño. Verificado con un probe aislado contra Mongo real
  (base temporal, no commiteado, borrado después):

  ```
  CAMPOS: ["id","lapidaId","usuarioId","autor","texto","creadoEn"]
  ```

  El dato ya era público antes de los comentarios, así que sacarlo de un endpoint
  y no del otro es cosmético. Además es **una decisión registrada**, no un spread
  que se coló: está declarado en `comentario.interface.ts`, `comentario.schema.ts`
  y fijado por `comentarios.service.spec.ts`. Decisión del usuario: **dejarlo como
  está**, documentado en `docs/decisions.md` como **D-012** para que el próximo
  revisor no lo levante de nuevo. **Lección de método:** mi primer análisis lo
  llamó "el más serio" sin verificar si el dato era realmente confidencial en el
  resto del sistema; dos `curl` al backend corriendo lo refutaron.
- **L22** — Cierre de los hallazgos que quedaban vivos (`R1-002`, `R1-003`,
  `R2-003`, `R2-005`). Commit `d4af22a`. El usuario, 2026-10-20, ante las dos
  preguntas de despliegue: "**Todavía no hay despliegue definido**" y, sobre
  dónde vivirá el frontend, "**No lo sé todavía**".

  **Lo que ese contexto cambia.** `R1-002` y `R1-003` no se cierran con un valor
  fijo: su default correcto **depende de dónde corra el backend** y hoy no hay
  respuesta. Verificado: el `docker-compose.yml` solo levanta Mongo, no hay
  nginx ni proxy, y no existe URL de producción declarada en ningún archivo. En
  vez de inventar valores de producción —o de dejar el default abierto, que es
  el riesgo real— las dos quedaron **configurables con el default de hoy**.

  **`RIPLANTA_TRUST_PROXY`.** Default: no confiar en ningún header de proxy (el
  comportamiento actual). Detrás de un proxy sin esto, todos los clientes
  comparten la IP del proxy y cinco fallos ajenos bloquean a todos con ese
  usuario. **El default es no confiar a propósito, y el motivo importa más que
  el hallazgo original:** si el backend queda accesible directo *y* confía en
  `X-Forwarded-For`, cualquiera falsea su IP con ese header y **saltea el
  rate-limit entero**. Activar esto a ciegas habría abierto un agujero peor que
  el que cerraba. `1` = último salto; `N` = últimos `N` saltos. Un valor que no
  se entiende (`si`, `0`, `-1`) **apaga** la confianza en vez de encenderla a
  medias.

  **`RIPLANTA_CORS_ORIGINS`.** Default: refleja el origen que pide (lo de hoy,
  acotado por `SameSite=Lax`). Con valores: allowlist exacta. Una variable
  definida pero **vacía** se interpreta como "sin allowlist" y no como lista
  vacía que rechazaría todo el tráfico — es un error de despliegue común y no
  puede convertirse en una caída.

  **Diseño: costura, no configuración de desarrollo.** Ninguna de las dos está
  en `.env.example`, por el mismo motivo que `RIPLANTA_UPLOADS_DIR`: quien las
  defina creyendo que son config cambia el comportamiento de seguridad sin
  querer. Viven en `src/shared/config-despliegue.ts`, siguiendo el patrón de
  `shared/validation-pipe.ts`, y tienen spec propia (10 tests).

  **`R2-003`.** `@IsNotEmpty` es `value !== '' && value !== null && value !==
  undefined`, así que **`" "` lo pasaba** y llegaba al servicio, donde gasta una
  comparación bcrypt contra el cebo sin ser una credencial. RED real (e2e):
  ambos casos fallaban contra `expect(400)`. GREEN: `@Matches(/\S/)` en
  `username` y `password`, **mismo criterio que `CreateCategoriaDTO` ya usa**
  para `nombre`. No es un bypass: el schema tiene `trim: true`, así que no se
  puede registrar un usuario que normalice a otro. Verificado que
  `IniciarSesionDTO` **solo lo usa el login** — el registro tiene su propio
  `CrearUsuarioDTO` — así que no hay regresión ahí.

  **`R2-005`.** El doc decía `App.tsx`; la ruta real es `frontend/src/app/App.tsx`.

  **Verificación observada:** unit **93/93** (eran 83; +10 de la costura nueva) ·
  e2e **34/34** (eran 32; +2 del DTO) · `build` y `lint` limpios. **El default
  no cambia el comportamiento en runtime**: sin las variables definidas,
  `saltosDeProxy()` devuelve `false` y `corsOriginsPermitidos()` devuelve
  `true`, que es exactamente lo que había antes por construcción.

  **Un error propio durante el trabajo:** el primer `edit` de `main.ts` dejó el
  bloque final duplicado y **el build falló** (`Found 3 error(s)`, `main.ts:54`).
  Se detectó porque el build se corre siempre, no porque el cambio pareciera
  correcto. Lección: editar `main.ts` con un `oldString` que no incluye el cierre
  de la función duplica el residuo.

  **Estado de los hallazgos de `L15`: los nueve están cerrados, obsoletos o
  documentados como no determinables.** No queda ninguno pendiente.
