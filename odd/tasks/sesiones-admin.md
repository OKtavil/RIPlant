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
- [x] T9 — Commit de la unidad de trabajo. *(inline)*

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
- **L5** — Los middlewares se aplican en orden desde `AppModule.configure` para
  que la resolución de sesión (`SesionesMiddleware`) corra antes que la
  autorización (`AdminMiddleware`). `AdminMiddleware` además resuelve la sesión
  por su cuenta si `req.sesion` no está, para no depender del orden de montaje.
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
