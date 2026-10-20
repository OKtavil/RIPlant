# Plan: las cinco brechas de backend que pide el frontend

Objetivo: dejar registradas las decisiones del usuario sobre las capacidades que el prototipo
pide y la API todavía no ofrece, con su alcance, dependencias y orden de implementación.
**No hay implementación todavía**: este documento es el insumo de las features que vienen.

Rama: `copilot/working-copy` (worktree `RIPlant-worktree`).
Contraparte: `odd/tasks/frontend-prototipo.md` (S10 documenta la brecha desde el front y E3 la
detectó). Este documento es la vista de backend de esa misma brecha.

## Specs

### S1 — Alcance y reglas generales

Las cinco capacidades pendientes son: **registro de cuentas**, **recuperar/nueva contraseña**,
**comentarios en el detalle**, **subir foto de la planta** y **"asesinos seriales"** (muertes
por usuario). A ellas se suman dos trabajos que la decisión de propiedad arrastra:
**publicar sin causa de muerte** y **cerrar las mutaciones de `/lapidas`**, hoy abiertas.

Reglas que no cambian: se implementa con **middlewares**, no con guards (instrucción explícita
del usuario en `sesiones-admin.md`); los mensajes técnicos al usuario van en español; las
claves JSON y los identificadores de dominio van en español; el `passwordHash` nunca sale en
ninguna respuesta; no se inventan datos ni se simula guardado desde el front.

### S2 — Publicar sin causa de muerte

`causaMuerte` deja de ser obligatoria: `@IsOptional()` en `create-lapida.dto.ts` (se mantiene
el tope de 80 caracteres) y se quita `required: true` en `lapida.schema.ts`, con `default: ''`.
El seed de `lapidas.service.ts` conserva sus propios valores. Efecto: el campo
`Causa de muerte` que el front agregó por obligación (S5 del documento del frontend) pasa a ser
opcional.

### S3 — Registro de cuentas

`POST /usuarios` en un `usuarios.controller.ts` nuevo; el módulo ya existe con el service y
sin controlador. Cuerpo `{ username, password }`, **sin email** (D1).

- `rol` **nunca** se lee del cuerpo: siempre `usuario`. El administrador sale solo del seed por
  variables de entorno.
- Reusa `hashPassword()` de `usuarios/password.ts`.
- Username duplicado → `409`, dejando que lo decida el índice `unique` de `username` en vez de
  una consulta previa (evita la carrera entre comprobar e insertar).
- La respuesta nunca incluye `passwordHash`.
- **Auto-login**: sí. Reusa `SesionesService.iniciar()` y devuelve la misma cookie que el login,
  para que el front quede logueado al crear la cuenta.
- Rate limit: reusa el limitador en memoria del login, con la misma clave `ip|usuario`.

### S4 — Propiedad de la lápida y cierre de `/lapidas`

Decisión del usuario: **cada usuario puede borrar su propia lápida, el admin puede con todas**,
y si se borra el dueño se borran sus lápidas. Las lápidas que llegan sin dueño **no se borran:
se le entregan al usuario Zombie** (D-008, S4.1).

- `lapida.schema.ts`: agrega `usuarioId` (referencia al usuario, **obligatorio**).
- `POST /lapidas`: middleware de sesión requerida (cualquier rol logueado). Estampa `usuarioId`
  y `autor = username` desde la sesión; el `autor` que mande el cliente se ignora.
- `PUT /lapidas/:id` y `DELETE /lapidas/:id`: middleware dueño-o-admin. Como la política
  necesita el recurso, el middleware carga la lápida por `:id` y la adjunta a la request; sin
  sesión → `401`, con sesión de otro usuario y sin rol admin → `403`.
- `DELETE /lapidas/:id` borra en cascada sus comentarios y sus coronas.
- El borrado de usuarios **no existe hoy**: la regla "se borran si el dueño se borra" queda
  documentada como política para cuando exista, y alcanza a sus lápidas, comentarios, coronas,
  sesiones y archivos de foto.
- `GET /lapidas` y `GET /lapidas/:id` siguen públicos. Ambos enriquecen cada lápida con
  `duenio: { username, rol }`, resuelto contra `usuarios` (S4.1). El front resuelve el perfil
  **y** el estado zombie sin pedidos extra y sin `GET /usuarios/:id`. Costo conocido: un lookup
  extra por lápida; aceptable con este volumen, y si doliera se denormaliza después.

#### S4.1 — El usuario Zombie

Las lápidas sin dueño (datos previos a esta feature, o escritos directo en Mongo) **no se
eliminan**: pertenecen al cementerio, el front las muestra y van marcadas como distintas.

- Usuario reservado `zombie`, sembrado en el arranque con el mismo patrón upsert que el admin.
  `rol: 'zombie'` — un tercer rol que **no autoriza nada** en ningún endpoint.
- Su `passwordHash` es aleatorio e intratable: nadie puede iniciar sesión como zombie.
- `POST /usuarios` rechaza los nombres reservados `admin` y `zombie` con `400`. No es `409`:
  no es una colisión con otro registro, es un nombre prohibido. El índice único de `username`
  sigue siendo el respaldo contra la carrera.
- **Migración al arrancar, antes de sembrar**: `updateMany` de las lápidas sin `usuarioId` (o
  con un `usuarioId` inexistente) hacia el `usuarioId` del zombie. Idempotente: correr dos veces
  no duplica nada y las lápidas ya dueñas no se tocan.
- **No hay purga.** Ninguna lápida se borra por carecer de dueño.
- El front distingue por `duenio.rol === 'zombie'`. **No** compara usernames ni ids: sería
  repetir el error de `autor` que esta misma feature reemplaza.
- `GET /lapidas/asesinos` **excluye al zombie**. No es un jugador, es el estado de una lápida.
- No confundir con la insignia **Superviviente Zombie** del README, que es otra cosa: marca a
  una lápida reportada muerta que volvió a dar señales de vida.

### S5 — Coronas: una por usuario por lápida

Decisión del usuario: **un usuario solo puede dar una corona a una lápida**.

- Colección nueva `coronas`: `{ lapidaId, usuarioId, creadaEn }` con índice compuesto **único**
  `{ lapidaId, usuarioId }`. La idempotencia la garantiza la base, no una consulta previa.
- `POST /lapidas/:id/corona` pasa a exigir sesión (hoy es anónimo). La segunda corona del mismo
  usuario no incrementa el contador.
- `coronasCount` sigue denormalizado en la lápida y se incrementa solo si la inserción de la
  corona tuvo éxito.
- Consecuencia conocida: las coronas anteriores a esta feature no tienen autor registrado, así
  que `coronasCount` puede ser mayor que la cantidad de documentos en `coronas`. No se
  reconstruye: queda como inconsistencia documentada.

### S6 — Comentarios en el detalle

- Colección nueva `comentarios`: `{ lapidaId (indexado), usuarioId, autor, texto, creadoEn }`.
- `GET /lapidas/:id/comentarios` — público, ordenado por fecha ascendente.
- `POST /lapidas/:id/comentarios` — requiere sesión (cualquier rol logueado). El autor y el
  `usuarioId` salen de la sesión, no del cuerpo.
- `DELETE /comentarios/:id` — **solo admin** (D5). El autor no borra el suyo.
- Al borrar una lápida se borran sus comentarios (cascada de S4).

### S7 — Asesinos seriales

- `GET /lapidas/asesinos` devuelve `[{ username, muertes }]`, agrupando por `usuarioId` y
  ordenando de mayor a menor. El nombre se resuelve contra `usuarios.username` (fuente de
  verdad), no contra el `autor` denormalizado, que en datos viejos es texto libre.
- Puede ofrecer el top N (propuesta: 10).
- Las lápidas sin dueño no cuentan; con S4 no debería quedar ninguna.

### S8 — Subir foto de la planta

Decisión del usuario: **disco local** (lo recomendado).

- `POST /lapidas/:id/foto`, multipart con el campo `foto`, con sesión dueño-o-admin.
- `FileInterceptor` de `@nestjs/platform-express`, que ya está instalado; suma `@types/multer`
  en desarrollo para los tipos.
- Validaciones: tamaño máximo 5 MB, tipo real por **magic bytes** (jpeg, png, webp), y nombre
  generado con `randomUUID()` más la extensión derivada del tipo detectado. Nunca el nombre que
  manda el cliente.
- Destino: `backend/var/uploads/` (ignorado por git), servido estático desde `main.ts`.
  `@nestjs/serve-static` no está instalado y no hace falta agregarlo.
- Se guarda la ruta relativa `/uploads/<archivo>` en `fotoUrl`. Como el DTO valida `@IsUrl` y
  una ruta relativa no pasa ese validador, la foto deja de aceptarse por el JSON de
  crear/editar: la única vía es este endpoint.
- Al reemplazar la foto se borra el archivo anterior, y al borrar la lápida se borra el suyo
  (ambos best-effort).
- El almacenamiento queda detrás de una interfaz (`AlmacenamientoService`) para poder pasar a
  S3/R2 sin tocar los controladores.

### S9 — Recuperar / nueva contraseña (diferida)

Decisión del usuario: **al final, porque necesita un proveedor de email** (D6).

- Requisitos: campo `email` en `usuarios` (hoy no existe) y transporte de email.
- Consecuencia aceptada de D1 (email deshabilitado en el registro): al implementar esta feature
  habrá que **migrar los usuarios existentes**, porque ninguno tiene email con el que
  recuperar la cuenta.
- Diseño previsto: token opaco aleatorio guardado **solo como SHA-256** (mismo patrón que las
  sesiones), TTL de 30 minutos, un solo uso, e invalidación de todas las sesiones del usuario al
  cambiar la contraseña. La respuesta es `202` siempre, exista o no la cuenta.
- `EmailService` con transporte de consola en desarrollo, para poder trabajar sin proveedor.

### S10 — Documentación y contrato

`README.md` y `docs/spec.md` se actualizan con cada endpoint nuevo, los códigos nuevos
(`401`, `403`, `409`) y la regla de propiedad de la lápida.

### S11 — Datos semilla

El seed deja de ser un aperitivo de dos lápidas: pasa a ser **el banco de pruebas** contra el
que se desarrolla y se verifica todo lo anterior.

- **Usuarios**: `admin` (rol `admin`, credenciales por env), `zombie` (rol `zombie`, sin
  contraseña utilizable) y **`jardinera`** (rol `usuario`), con contraseña de desarrollo
  documentada en el seed. Tres dueños reales: sin el tercero, asesinos seriales tendría una
  sola fila y no se podría verificar el orden.
- **Categorías**: de 2 a 6, con nombres del vocabulario del dominio.
- **Lápidas**: entre 8 y 10, con `coronasCount` variado (de 0 a ~15) para que el Salón del
  Honor tenga orden real y no una meseta de ceros.
- **Reparto de dueños**: una mayoría a nombre de los usuarios normales y **al menos dos a
  nombre de `zombie`**, de modo que el front se desarrolle contra los dos estados sin
  fabricarlos a mano.
- El seed sigue siendo idempotente (`$setOnInsert` + upsert), corre **después** de la
  migración de S4.1, y escribe `usuarioId` en todas las lápidas que crea.

## Tasks

Todas pendientes: este documento registra decisiones, no autoriza implementación.

| ID | Tarea | Specs | Estado | Commit |
|---|---|---|---|---|
| T1 | `causaMuerte` opcional (DTO, schema y tests) | S2 | ✅ hecho | `65eae81` |
| T2 | `POST /usuarios` con auto-login y `rol` forzado | S3 | ✅ hecho | `398ce55` |
| T3 | `usuarioId` obligatorio + middlewares de sesión y de dueño-o-admin en `/lapidas` + usuario `zombie`, migración de huérfanas y datos semilla ampliados | S4, S4.1, S11 | ✅ **cerrado** | `44ac10b` + `e1edbae` |
| T4 | Coronas: colección `coronas`, índice único y sesión requerida | S5 | ✅ hecho | `aea9790` |
| T5 | Comentarios: colección, los tres endpoints y borrado solo admin | S6 | ✅ hecho | `d68590d` |
| T6 | `GET /lapidas/asesinos` con el agregado por dueño | S7 | ✅ hecho (salió junto a T3) | `44ac10b` |
| T7 | Subida de foto a disco local con servido estático | S8 | pendiente | — |
| T8 | Recuperar y nueva contraseña (diferida) | S9 | pendiente | — |
| T9 | Documentación de los endpoints nuevos | S10 | pendiente | — |

## Orden y dependencias

1. **T1** — sin dependencias; le saca una traba inmediata al front.
2. **T2 + T3 + T4** — un solo slice. La propiedad de la lápida es lo que desbloquea T5 y T6, y
   decidir quién puede publicar o borrar es también lo que cierra `/lapidas`. S4.1 y S11 viven
   acá: crecen el tamaño de T3 pero no abren una ruta paralela.
3. **T5** (comentarios) — necesita usuarios reales y la cascada de T3.
4. **T6** (asesinos) — barato una vez que existe `usuarioId`; sin T3 es imposible, porque el
   dato no está.
5. **T7** (foto) — independiente; entra en cualquier hueco.
6. **T8** (recuperación) — última por D6.

## Pendientes a resolver al implementar

- **Dueño de las lápidas existentes** — ✅ **resuelto (D-008)**: no se borran, se transfieren al
  usuario `zombie`. Ver S4.1. La purga descartada por el usuario en favor del usuario especial.
- **Tercer usuario en el seed** — ✅ **resuelto**: `jardinera` (rol `usuario`), confirmada por
  el usuario en L7. Sin una segunda cuenta real, asesinos seriales no se puede verificar con
  más de una fila.
- **Mínimo de caracteres de la contraseña** en el registro (propuesta: 8, **sin confirmar**).
- **Código y mensaje de la segunda corona** — ✅ **implementado, sin confirmar**: `409` con
  mensaje técnico en español. Ver E5.
- **Tope de caracteres del comentario** (propuesta: 500, **sin confirmar**).
- **Entrega del frontend** (`P1` del documento del frontend). La divergencia de rama de L4
  **ya no existe**: verificado en E3, la rama está en `ahead 0 / behind 0` con el remoto.

## Log

- **L1 (2026-10-19, solicitud original del usuario, verbatim):**
  > okey falta lo siguiente que necesita el front endPrototipo pide	Backend ofrece
  > Registro de cuenta	❌ no existe
  > Recuperar / nueva contraseña	❌ no existe
  > Comentarios en el detalle	❌ no existe endpoint
  > Subir foto de la planta	❌ solo acepta fotoUrl (URL)
  > "Asesinos seriales" (nº de muertes por usuario)	❌ usuarios solo expone id/username/rol
  > Publicar sin causa de muerte	⚠️ el DTO la exige
  > ✅ Cementerio, Ranking por coronas, Detalle+corona, Categorías CRUD (admin), Login/Logout	sí

- **L2 (2026-10-19, decisiones del usuario, verbatim):**
  > Emaiil, de momento lo desabilitamos para implementarlo despues, debido a la desision tipo
  > retro, para la foto, vamos con lo recomendado, para la propiedad, cada usuario puede borrar
  > su propia lapida y no puede haber lapidas sin dueño, se  borran si dueño tambien se borra,
  > admin puede con todas, hay que limitar coronas a que un usuaria solo puede dar una corona a
  > una lapida, los comentarios solo logueados y borrar solo admin, dado que recuperacion
  > necesita proveedor de email, vamos a dejarlo al ultimo, despues de documentar estas
  > desiciones, documentalas y haz un commit, continuaremos la implementacion deespues

  Decisiones derivadas, numeradas para referencia en las features:

  | ID | Decisión |
  |---|---|
  | D1 | **Email deshabilitado** por ahora; se implementa después. No se pide email en el registro. |
  | D2 | **Foto en disco local** (lo recomendado), con las validaciones de S8. |
  | D3 | **Propiedad**: cada usuario borra su propia lápida; no hay lápidas sin dueño; si se borra el dueño se borran sus lápidas; el admin puede con todas. |
  | D4 | **Coronas**: un usuario, una corona por lápida. |
  | D5 | **Comentarios**: solo logueados; borra solo el admin. |
  | D6 | **Recuperación de contraseña**: última, porque necesita proveedor de email. |

- **L3 (2026-10-19, orden de trabajo, verbatim):**
  > despues de documentar estas desiciones, documentalas y haz un commit, continuaremos la
  > implementacion deespues

- **E1 (2026-10-19, verificación de las afirmaciones de L1 contra el código):** las seis filas
  se confirmaron, con dos precisiones:
  - `usuarios` no es que exponga "solo `id/username/rol`": **no expone nada**. No existe
    `usuarios.controller.ts`; ese `{ id, username, rol }` sale de `GET /sesiones/actual`.
  - Se detectó un séptimo hueco que no estaba en la tabla: **todas las rutas de `/lapidas` están
    abiertas**. No hay ningún guard en todo el backend; los únicos middlewares son
    `SesionesMiddleware` (global, resuelve `req.sesion` y no bloquea) y `AdminMiddleware` en las
    tres rutas de mutación de categorías. Cualquiera puede crear, editar y borrar lápidas de
    otros. Se resuelve en T3, porque necesita la decisión de propiedad.
  - `lapida.autor` es texto libre de hasta 40 caracteres y no hay `usuarioId` en la lápida: el
    dato de "muertes por usuario" **no existe** y no se puede derivar de lo que hay. Confirma
    que T6 depende de T3.
  - `causaMuerte` es obligatoria en `create-lapida.dto.ts` (`@IsString` + `@IsNotEmpty`, sin
    `@IsOptional`) y `required: true` en el schema. `fotoUrl` es opcional y valida `@IsUrl`.

- **E2 (2026-10-19, estado de git al documentar):** el trabajo del frontend ya está commiteado
  (siete slices), el árbol de trabajo quedó limpio salvo la fuente de verdad del diseño
  (`R.I.Planta - Diseño retro.html` y `riplanta.op`, modificados sin commitear, más los
  respaldos `riplanta copy.op` y `riplanta.bk.op` sin trackear).

- **L4 (2026-10-19, divergencia de rama detectada, sin resolver):**
  `copilot/working-copy` quedó **ahead 8 / behind 2** respecto de `origin/copilot/working-copy`,
  con `8f4af61` (el último commit del backend) como ancestro común. El remoto tiene el frontend
  como un commit monolítico (`cae6e4d` + `093cf38`); local está rehecho como siete slices
  (`25ee66e`, `030a5dd`, `8a12607`, `177be80`, `b015cde`, `d88d7d1`, `4b7843b`) más el `171642c`.
  Es una divergencia de **forma de la historia**, no de contenido. Requiere decisión del usuario
  (rehacer la historia del remoto, o hacer merge) y bloquea cualquier push de esta rama.

- **L5 (2026-10-19, corrección del usuario sobre el dueño de las existentes, verbatim):**
  > Volvamos a la pregunta anterior, si la aplicacion detecta una lapida sin dueño, hay que
  > eliminarla y evitar que el frontend la muestre

  Quedó registrado como purga al arrancar más filtro en la query, **antes de L6**. Se conserva
  aquí porque L6 lo reemplaza, no lo borra.

- **L6 (2026-10-19, decisión del usuario que reemplaza a L5, verbatim):**
  > Cambia el seed para tener mas datos de prueba y que coincida con esto, en vez de una purga
  > instantanea, se me ocurrio algo mejor, dales un nuevo usuario espcial, Zombie y haz que el
  > frontend muestre esas lapidas y sean diferentes a las normales, como esto es backend, solo
  > modifica los docs y luego acomodamos el front

  Deriva en **D-008** y en **S4.1**. Descarta la purga de L5. Alcance de este cambio: **solo
  documentación**; el front se acomoda después (S4.1 deja escrito que el distingue por
  `duenio.rol`, no por comparación de strings).

- **E3 (2026-10-19, verificación del código antes de escribir S4.1 y S11):**
  - `lapida.schema.ts` no tiene `usuarioId` en absoluto; los campos obligatorios actuales son
    `id`, `nombrePlanta`, `epitafio`, `fechaFallecimiento`, `fechaPublicacion`, `autor`,
    `categoriaId` y `causaMuerte`. `fotoUrl` y `coronasCount` tienen default.
  - El seed corre en `onModuleInit()` de `lapidas.service.ts` con `bulkWrite` y
    `$setOnInsert` + `upsert: true`, y crea exactamente dos lápidas (id 1 y 2) sin dueño.
  - El frontend **no filtra nada por dueño**: la única comparación de este tipo está en
    `PerfilPage.tsx:20` (`lapida.autor === sesion.username`), que es exactamente el patrón de
    string frágil que `usuarioId` reemplaza. Confirma que el estado zombie tiene que salir de
    la API y no de una comparación en React.
  - La divergencia de L4 ya **no existe**: `copilot/working-copy` está en `ahead 0 / behind 0`
    respecto de `origin/copilot/working-copy` tras un `git fetch`. El resto del documento no
    se toca por eso.

- **L7 (2026-10-19, confirmación del usuario sobre el tercero del seed, verbatim):**
  > dale con otro usuario entonces

  Confirma la propuesta de S11: el seed crea también a `jardinera` (rol `usuario`). Quedan
  tres dueños reales — `admin`, `jardinera` y `zombie` — para que asesinos seriales se
  pueda verificar con más de una fila.

- **E4 (2026-10-19, verificación de T3 al implementarlo):**

  **Implementado (T3, S4/S4.1/S11; absorbe también T6/S7):**

  - `lapida.schema.ts` e `lapida.interface.ts`: `usuarioId` obligatorio e indexado, más
    `duenio?: { username, rol }` en la interface (campo de respuesta, no de schema).
  - `create-lapida.dto.ts`: `usuarioId` opcional declarado **solo** para que
    `forbidNonWhitelisted` no rechace el campo; el servicio **nunca** lo lee del cuerpo.
  - `DuenoOAdminLapidaMiddleware` (`sesiones/dueno-o-admin-lapida.middleware.ts`): carga la
    lápida por `:id` y la adjunta a la request. Sin sesión → `401`; lápida inexistente o id
    inválido → `404`; sesión de otro usuario sin rol `admin` → `403`.
  - `LapidasModule` implementa `NestModule` y aplica ese middleware a `PUT /lapidas/:id` y
    `DELETE /lapidas/:id`. **`POST /lapidas` no lo lleva**: lo cubre el `SesionesMiddleware`
    global, que ya resuelve `req.sesion`; el controlador lo exige y rechaza si falta.
  - `LapidasService.create()` estampa `usuarioId` y `autor = sesion.usuario.username` desde la
    sesión, ignorando `autor` e `usuarioId` del cuerpo.
  - `LapidasService.onModuleInit()` ahora: (1) siembra `zombie` (rol `zombie`, hash intratable
    de contraseña aleatoria) y `jardinera` (rol `usuario`) con upsert idempotente; (2) migra las
    huérfanas al zombie (`$or: usuarioId ausente/null/vacío`), idempotente; (3) siembra 10
    lápidas con `$setOnInsert`, ids 7 y 8 a nombre de zombie, `coronasCount` de 0 a 15.
  - `GET /lapidas` y `GET /lapidas/:id` enriquecen cada lápida con `duenio: { username, rol }`
    resuelto contra `usuarios` en un solo `$in` por lote (no N+1).
  - `GET /lapidas/asesinos` (T6, S7): agrupa por `usuarioId`, resuelve el nombre contra
    `usuarios.username`, excluye al zombie y devuelve el top 10.

  **Dos hallazgos de implementación que valen registro:**

  - **Colisión real de módulos `UsuariosModule ↔ SesionesModule`.** `UsuariosController`
    necesita `SesionesService` (auto-login de T2) y `SesionesModule` importa `UsuariosModule`.
    Sin resolverlo, **todo el backend deja de arrancar**: los e2e fallan en `app.init()`, no en
    las aserciones. Resuelto con `forwardRef` en ambos lados.
  - **`import()` dinámico no es utilizable en este proyecto sin extensiones explícitas.** El
    `tsconfig` es `module: nodenext` + `moduleResolution: nodenext`, así que el import
    dinámico exige `.js`; pero ts-jest resuelve el nombre lógico y entonces `.js` no existe
    en el runtime de los tests. Ninguna de las dos formas satisface build **y** unit tests
    a la vez. Se resolvió con `require('../usuarios/password')` síncrono dentro del helper
    de hash intratable. Queda anotado porque es una trampa que se va a repetir.

  **Verificación observada:** `pnpm run test` 40/40 · `pnpm run test:e2e` 24/24 ·
  `pnpm run build` sin errores · `pnpm run lint` sin warnings. `git status` limpio respecto
  del otro agente antes de commitear.

  **Brecha conocida que T3 deja abierta (S11 incompleto):** el seed de **categorías** sigue
  en 2, pero el de lápidas ya referencia `categoriaId` 3, 4, 5 y 6. Hasta que se amplíe el seed
  de categorías a 6, esas lápidas apuntan a categorías inexistentes. Es lo próximo a cerrar.
  Tampoco entra todavía T4: `giveCorona` sigue incrementando sin el índice único de `coronas`.
  Eso quedó cerrado en `aea9790`; ver E5.

- **E5 (2026-10-19, verificación de T4 al implementarlo):**

  **Qué entró:** colección `coronas` (`lapidaId` numérico, `usuarioId`, `creadaEn`) con índice
  compuesto único `lapidaId + usuarioId`. `POST /lapidas/:id/corona` exige sesión, registra la
  corona primero y recién entonces incrementa `coronasCount`, de modo que el contador nunca se
  adelante al registro que lo justifica.

  **Corrección que arrastra T3:** `POST /lapidas` lanzaba `new Error('Sesión requerida')` desde el
  controlador. `Error` no es un `HttpException`, así que Nest respondía **500** en vez del `401`
  que pide S4. Se reemplazó por middleware —`SesionRequeridaMiddleware`, autenticación pura sin
  mirar rol— que cubre ahora `POST /lapidas` y `POST /lapidas/:id/corona`. La autorización por
  dueño sigue siendo laburo de `DuenoOAdminLapidaMiddleware`; no se mezclan las dos
  responsabilidades. Es también la instrucción explícita del usuario: middleware, no guards.

  **Decisión asumida, sin confirmar:** la segunda corona responde `409` con el mensaje técnico
  «Este usuario ya corono esta lápida». Si el front prefería un `200` idempotente, es un cambio de
  una línea. El front ya muestra el mensaje del `ApiError` en `App.tsx:93`, así que el aviso
  aparece sin tocar nada del lado cliente.

  **Impacto en el contrato:** `POST /lapidas/:id/corona` dejó de ser anónimo. Verificado contra el
  front: `frontend/src/shared/api/client.ts:56` manda `credentials: 'include'` en **cada**
  petición y hay test que lo fija (`client.test.ts:27`), así que el flujo sigue funcionando y no
  hizo falta cambiar nada del lado cliente. Ese era el riesgo concreto de T4 y está cerrado con
  evidencia.

  **Verificación observada:**
  - RED observado antes de implementar: 1 test rojo, 40 en verde.
  - `pnpm run test` 41/41 · `pnpm run build` sin errores · `pnpm run lint` sin warnings.
  - Humo en vivo contra una **base scratch** (`riplant_smoke_t4`), nunca contra la del usuario:
    `GET /lapidas` `200` público · `POST /lapidas/1/corona` sin cookie `401` ·
    `POST /lapidas` sin cookie `401` (antes `500`) · login `201` · 1ª corona `201` con
    `coronasCount` 12→13 · 2ª corona del mismo usuario `409` y el contador **seguía en 13**, que es
    la prueba real de que el índice único está creado. Sin errores en el log del servidor.
  - El contenedor de Mongo estaba apagado hace 9 horas; se levantó para el humo y se bajó de
    vuelta. La base del usuario quedó con sus 4 colecciones sin tocar; la scratch se dropeó.

  **Inconsistencia conocida y aceptada (S5):** `coronasCount` de las lápidas sembradas (12, 8, 5,
  3, 15, 0, 2, 1, 7, 9) es denormalizado y no tiene documentos en `coronas` que lo justifiquen. No
  se reconstruye; queda documentado.

  **Brecha que sigue abierta (E4):** el seed de categorías sigue en 2 y hay lápidas que
  referencian `categoriaId` 3, 4, 5 y 6. Es lo próximo a cerrar.

- **E6 (2026-10-19, cierre de T3 con S11):**

  **Qué entró:** el seed de categorías pasó de 2 a 6 con vocabulario del dominio —
  `Olvido`, `Clima extremo`, `Plagas` y `Accidente` junto a las dos que ya existían.
  De las diez lápidas sembradas, seis apuntaban a `categoriaId` 3, 4, 5 o 6: esas
  categorías no existían, así que el filtro del front recibía el id crudo. Con esto
  **T3 queda cerrado** (`44ac10b` + `e1edbae`) y **T6 apunta al mismo commit `44ac10b`**:
  el agregado por dueño ya funcionaba, lo que faltaba era el catálogo que lo acompañaba.

  **Verificación observada:**
  - RED observado antes de implementar: el test nuevo esperaba 6 categorías y recibía 2.
  - `pnpm run test` 42/42 · `build` y `lint` limpios.
  - Humo en vivo contra base scratch **pre-sembrada con las 2 categorías previas** (el
    camino real de la base existente, no una base vacía): tras el boot, 6 documentos con
    `id` 1 y 2 **intactos, sin renombrar**. Tres boots seguidos sobre la misma base:
    `2 → 6 → 6 → 6`, sin duplicados — `$setOnInsert` + upsert sigue siendo idempotente.
  - `GET /lapidas` cruzado contra `GET /categorias`: **0 huérfanas**.
  - El contenedor de Mongo se levantó y se bajó igual que en E5; la base del usuario no
    se tocó.

  **Incidente de proceso (importante para lo que sigue):** este worktree tiene un
  **actor concurrente**. Al hacer `git add` de mis dos archivos y `git commit`, el commit
  barrió **7 archivos del frontend del otro actor que ya estaban en el índice**, en un
  commit cuyo mensaje no los describía. Se corrigió con `git reset --soft HEAD~1` +
  `git commit -- <rutas propias>`: el commit volvió a `e1edbae` con solo mis dos archivos
  y los suyos quedaron staged como estaban. **Regla para este worktree: nunca
  `git commit` a pelo; siempre con `-- <rutas>`.**
  (Corrección de E7: `-- <rutas>` **no alcanza para archivos nuevos**, se omite
  lo que no está trackeado. La regla real es `git add <rutas propias>` →
  `git diff --cached` → `git commit` sin pathspec.)

- **E7 (2026-10-20, comentarios implementados — T5/S6):**

  **Qué entró:** colección `comentarios` (`lapidaId` indexado, `usuarioId`, `autor`, `texto`,
  `creadoEn`) y los tres endpoints: `GET /lapidas/:id/comentarios` público y ascendente,
  `POST /lapidas/:id/comentarios` con sesión de cualquier rol, y `DELETE /comentarios/:id`
  solo admin (D5). El `autor` y el `usuarioId` salen de la sesión, nunca del cuerpo.

  **Decisiones que la spec dejaba abiertas:**
  - **Id expuesto = `_id` de Mongo como string.** S6 lista los campos del comentario sin
    ningún id numérico, y un contador `max + 1` como el de `lapidas` y `categorias` es una
    carrera real acá: es un recurso que crea cualquiera con sesión y dos creaciones
    simultáneas se pisarían. `usuarioId` ya es ObjectId-string en este API, así que no se
    introduce una segunda convención.
  - **`texto` máximo 500** con `@MaxLength` (la propuesta decía 500; ahora está en código y
    en el mensaje de error, así que el front puede mostrarlo tal cual).
  - **404 en vez de lista vacía** para una lápida que no existe: una lista vacía mentiría
    sobre el estado del recurso.
  - **Sin deduplicación.** Comentar dos veces la misma lápida crea dos comentarios (probado).
    Lo que bloquea contenido repetido es el rol admin, no un índice único: la restricción de
    una corona por usuario (D4) es específica de coronas.
  - **Rutas en dos colecciones distintas** (`/lapidas/:id/comentarios` y `/comentarios/:id`),
    así que el controller va **sin prefijo de módulo**: un `@Controller('lapidas')` no puede
    servir las segundas. No choca con `LapidasController` porque `lapidas/:id` exige un solo
    segmento.

  **Bug encontrado y corregido durante la verificación en vivo:** `borrar()` usaba
  `findOneAndDelete({ _id: id }).lean()`. Con el `_id` como string, Mongoose **borra el
  documento y `lean()` devuelve `null`**, así que el endpoint borraba el comentario y
  respondía **404 igual**, dejando al admin creyendo que no había borrado nada. Se ve en el
  humo: `DELETE → 404` con `countDocuments` bajando de 1 a 0. Pasado a `deleteOne` +
  `deletedCount`, que es el único resultado que dice la verdad. Test de regresión agregado.
  **El unit test no lo detectaba** porque el mock devolvía un documento; lo cazó el humo
  contra Mongo real. Moraleja: los mocks de Mongoose no reproducen el casteo de `_id`.

  **Verificación observada:**
  - RED observado en los dos frentes: el módulo no existía (`Cannot find module`) y la
    cascada no estaba implementada.
  - `pnpm run test` 47/47 · `build` y `lint` limpios.
  - Humo en vivo contra base scratch (nunca la del usuario), con Mongo real:
    `GET` público **200** · lápida fantasma **404** · `POST` sin cookie **401** ·
    texto vacío **400** · texto de 501 **400** · `POST` en lápida fantasma **404** ·
    `DELETE` sin cookie **401** · id inválido **400** · admin **200** con Mongo 1→0 ·
    repetido **404** · dos comentarios del mismo usuario: **2 filas** · cascada:
    `DELETE /lapidas/1` → Mongo 2→0 y la lápida nueva que reutiliza el id 11 arranca con 0.
  - 0 errores en el log del servidor.

  **Cambio del entorno que importa (lo hizo otra sesión, no yo):** apareció
  `backend/src/shared/validation-pipe.ts` con **`whitelist` + `forbidNonWhitelisted`**, y eso
  hace que **`POST /lapidas/:id/comentarios` devuelva `400` si el cliente manda campos de
  más** (p. ej. `autor`). Es el comportamiento correcto y refuerza S6: el único campo que el
  cliente puede mandar es `texto`. El front debe mandar `{ texto }` y nada más.
  **Lo cazó el humo, no los tests**: mi unit test pasa un `autor` falso al servicio, que es
  correcto para probar que se ignora, pero nunca ejerce el pipe HTTP.

- **Nota de coordinación (2026-10-20):** este worktree tiene **un actor concurrente activo**.
  Mientras corría T4/T5 aparecieron commits suyos entrelazados (`022c150`, `1cb09ef`,
  `cb97920`, `e7bad15`, `17b0fb4`) y el pipeline de validación cambió bajo mis pies. Hay dos
  identidades de git: `Octavio <octaviocastillon@no-reply.com>` (la otra máquina) y
  `OKtavil <octavio@no-reply.com>` (**compartida**: yo commiteo con ella, y `17b0fb4` con esa
  identidad no es mío). Consecuencia práctica: **no se puede atribuir un commit por autor**;
  hay que mirar el contenido. Protocolo que funcionó: `git add <rutas propias>` exactas,
  verificar `git diff --cached --name-status` antes de commitear, y **nunca** `git add -A` ni
  `git commit` sin haber revisado el índice. El contenedor de Mongo y el puerto 3000 son
  compartidos: no bajarlos sin avisar.
