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

Decisión del usuario: **cada usuario puede borrar su propia lápida, no puede haber lápidas sin
dueño, el admin puede con todas**, y si se borra el dueño se borran sus lápidas.

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
- `GET /lapidas` y `GET /lapidas/:id` siguen públicos. `GET /lapidas` expone `usuarioId` para
  que el front resuelva el perfil sin endpoint nuevo.

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

## Tasks

Todas pendientes: este documento registra decisiones, no autoriza implementación.

| ID | Tarea | Specs | Estado |
|---|---|---|---|
| T1 | `causaMuerte` opcional (DTO, schema y tests) | S2 | pendiente |
| T2 | `POST /usuarios` con auto-login y `rol` forzado | S3 | pendiente |
| T3 | `usuarioId` obligatorio + middlewares de sesión y de dueño-o-admin en `/lapidas` | S4 | pendiente |
| T4 | Coronas: colección `coronas`, índice único y sesión requerida | S5 | pendiente |
| T5 | Comentarios: colección, los tres endpoints y borrado solo admin | S6 | pendiente |
| T6 | `GET /lapidas/asesinos` con el agregado por dueño | S7 | pendiente |
| T7 | Subida de foto a disco local con servido estático | S8 | pendiente |
| T8 | Recuperar y nueva contraseña (diferida) | S9 | pendiente |
| T9 | Documentación de los endpoints nuevos | S10 | pendiente |

## Orden y dependencias

1. **T1** — sin dependencias; le saca una traba inmediata al front.
2. **T2 + T3 + T4** — un solo slice. La propiedad de la lápida es lo que desbloquea T5 y T6, y
   decidir quién puede publicar o borrar es también lo que cierra `/lapidas`.
3. **T5** (comentarios) — necesita usuarios reales y la cascada de T3.
4. **T6** (asesinos) — barato una vez que existe `usuarioId`; sin T3 es imposible, porque el
   dato no está.
5. **T7** (foto) — independiente; entra en cualquier hueco.
6. **T8** (recuperación) — última por D6.

## Pendientes a resolver al implementar

- **Dueño de las lápidas que ya existen**: S4 dice que no puede haber lápidas sin dueño, y hoy
  las hay (incluidas las que siembra `lapidas.service.ts` al arrancar). Recomendado: que el seed
  las cree a nombre del administrador; hay que confirmarlo antes de tocar el schema.
- **Mínimo de caracteres de la contraseña** en el registro (propuesta: 8).
- **Código y mensaje de la segunda corona** (propuesta: `409` con mensaje técnico en español).
- **Tope de caracteres del comentario** (propuesta: 500).
- **Entrega del frontend** (`P1` del documento del frontend) y la divergencia de rama descrita
  en L4: el trabajo del frontend existe dos veces, como un commit monolítico en el remoto y como
  siete slices encadenados en local.

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
