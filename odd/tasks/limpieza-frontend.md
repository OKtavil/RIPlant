# Limpieza del frontend: coronas, comentarios, fotos y textos de auth

Rama: `copilot/working-copy` · Entrega: commits por unidad, **sin PR** (el usuario se encarga)
Runner: `pnpm --filter frontend run test` (Vitest) + `run build` (tsc -b, única señal de tipos) + `run lint` (oxlint)

## Specs

**S1 — Corona con estado y toggle.** La UI debe mostrar si **yo** ya le di corona a esta
lápida, y volver a tocar debe quitarla.
- El backend ya lo soporta: `POST /lapidas/:id/corona` (idempotente, `201`/`200`) y
  `DELETE /lapidas/:id/corona` (idempotente, quita la de **este** usuario). Las respuestas
  traen `coronadaPorMi: boolean`.
- Hoy el frontend solo llama a `giveCorona` y **nunca lee `coronadaPorMi`**.
- Frase del usuario (verbatim, L24): *"corregir las coronas, debe de tener un estado a las
  que ya les diste, y si vuelves a darle, quitarla tanto el estado como en la base de datos"*.

**S2 — Comentarios: alta y borrado admin.** Además de leer y escribir (ya hecho), un
`admin` puede borrar cualquier comentario. El autor **no** borra el suyo.
- Backend listo: `DELETE /comentarios/:id` (solo admin, vía `AdminMiddleware`).
- El botón debe verse **solo si `sesion.rol === 'admin'`**.
- Verbatim: *"se necesita implementar los comentarios junto la opcion de admin de borrarlos"*.

**S3 — Subida de foto en Publicar.** El formulario debe permitir elegir una imagen y subirla.
- Backend listo y **no usado**: `POST /lapidas/:id/foto` (multipart, campo `foto`,
  `memoryStorage`, límite 5 MB, valida JPEG/PNG/WebP por magic bytes, `415` si no,
  `413` si excede). Solo el dueño o admin.
- Orden real: `POST /lapidas` crea la lápida y devuelve su `id` → recién ahí
  `POST /lapidas/:id/foto`. No se puede subir la foto antes de crear.
- El `fotoUrl` se sirve en `/uploads/<archivo>`; la tarjeta y el detalle deben mostrarla.
- Verbatim: *"las imagenes de publicar"*.

**S4 — Login sin ruido.** Solo nombre de usuario y contraseña.
- Quitar el texto de ayuda: *"El prototipo rotula este campo CORREO ELECTRÓNICO, pero la
  API autentica por usuario."*
- Quitar el enlace *"¿OLVIDASTE TU CONTRASEÑA?"*.
- **Se conservan** `RecuperarPage`, `RestablecerPage`, sus rutas y sus boards del
  prototipo: solo dejan de alcanzarse desde el login (decisión del usuario).
- Verbatim: *"en el login quitar los mensajes del prototipo y api, Solo nombre y
  contraseña, sin recuperacion de contraseña"*.

**S5 — Registro sin correo.**
- Quitar el campo `CORREO ELECTRÓNICO` deshabilitado y su ayuda.
- Quedan: `NOMBRE DE USUARIO`, `CONTRASEÑA`, `CONFIRMAR CONTRASEÑA`.
- Verbatim: *"en registrar se necesita quitar el correo"*.

**S6 — Prototipo sincronizado.** El HTML y el `.op` deben reflejar S4 y S5.
- `Login` (board `63fa722b`): `CORREO ELECTRÓNICO` → `NOMBRE DE USUARIO`; fuera
  `¿OLVIDASTE TU CONTRASEÑA?`.
- `Crear cuenta` (board `c90fad3b`): fuera el bloque `CORREO ELECTRÓNICO`.
- El board `Recuperar` (`88b27349`) **no se toca**: el flujo queda vivo.
- Formato de reempaquetado del HTML: `'\n' + json.dumps(d, ensure_ascii=False,
  separators=(',',':')) + '\n  '`; el diff debe dar **1/1** en `git diff --numstat`.
- El `.op` se reescribe con `indent=2` (pretty-printed, 7735 líneas).

## Tasks

| ID | Spec | Tarea | Ruta | Estado |
|----|------|-------|------|--------|
| T1 | S1 | `coronadaPorMi` en el modelo + `quitarCorona` en la API + tests | inline | pendiente |
| T2 | S1 | Toggle en `DetallePage`/`GraveCard` + tests | inline | pendiente |
| T3 | S2 | `borrar` en `comentarios.api.ts` + botón admin en `ListaComentarios` + tests | inline | pendiente |
| T4 | S3 | `subirFoto` en la API + input de archivo en `PublicarPage` + tests | inline | pendiente |
| T5 | S3 | Mostrar `fotoUrl` en `GraveCard` y `DetallePage` + tests | inline | pendiente |
| T6 | S4 | Login: fuera ayuda y enlace de recuperación + tests | inline | pendiente |
| T7 | S5 | Registro: fuera el campo de correo + tests | inline | pendiente |
| T8 | S6 | Prototipo HTML: login y registro | inline | pendiente |
| T9 | S6 | Prototipo `.op`: login y registro | inline | pendiente |

## Log

- **L1 (2026-10-20)** — Pedido original del usuario, verbatim:
  *"Okey, necesitamos ir limpiando el front end, primero las entradas de la base de datos,
  se necesita implementar los comentarios junto la opcion de admin de borrarlos, corregir
  las coronas, debe de tener un estado a las que ya les diste, y si vuelves a darle,
  quitarla tanto el estado como en la base de datos, las imagenes de publicar, en el login
  quitar los mensajes del prototipo y api, Solo nombre y contraseña, sin recuperacion de
  contraseña, y en registrar se necesita quitar el correo, corrige el prototipo y html"*.

- **L2** — **Hallazgo que cambia el trabajo**: las tres capacidades que el pedido trata como
  "implementar" ya existen en el backend y el frontend no las usa, o muestra un aviso que
  dice lo contrario:
  - `POST /lapidas/:id/corona` + `DELETE /lapidas/:id/corona` + `coronadaPorMi`: existen.
    El frontend solo llama a `giveCorona` y **descarta `coronadaPorMi`**.
  - `DELETE /comentarios/:id` (admin): existe. Falta solo el botón.
  - `POST /lapidas/:id/foto`: **existe y está completo** (multipart, magic bytes, 5 MB),
    pero `PublicarPage` muestra un `AvisoNoDisponible` que afirma *"La subida de fotos
    todavía no tiene endpoint"*. **El aviso es falso.** Es el mismo patrón que el aviso de
    comentarios, que ya resultó falso una vez.
  - Conclusión: S1-S3 son de **cableado del frontend**, no de backend. Nada que pedirle a
    la otra sesión, salvo el bug del `trim` (ver L3).

- **L3** — Bug del backend detectado y **no tocado** (el código es de la otra sesión):
  `POST /lapidas/:id/comentarios` con `{"texto":"   "}` devuelve **201**, no `400`.
  `@IsNotEmpty` de class-validator no hace `trim`. El frontend lo bloquea con
  `esTextoValido()`, pero la API lo acepta.

- **L4** — Decisiones del usuario sobre el prototipo, vía pregunta explícita:
  - Recuperación de contraseña: **"Solo sacar el link del login"**. Se conservan los boards
    `Recuperar` y `Nueva pass`, `RecuperarPage`, `RestablecerPage` y sus rutas. El
    prototipo **sigue con 10 pantallas**.
  - Prototipo: **"Corregir el prototipo"**. El HTML y el `.op` se actualizan para reflejar
    la UI real. La contradicción que se le planteó: hasta ahora el HTML era la fuente de
    verdad y modificarlo invierte esa jerarquía; eligió corregirlo igual, para que el
    prototipo describa lo que existe en vez de una versión vieja.
