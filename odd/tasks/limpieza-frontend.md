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
| T6 | S4 | Login: fuera ayuda y enlace de recuperación + tests | inline | hecho |
| T7 | S5 | Registro: fuera el campo de correo + tests | inline | hecho |
| T8 | S6 | Prototipo HTML: login y registro | inline | hecho |
| T9 | S6 | Prototipo `.op`: login y registro | inline | hecho |

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

- **L5 (2026-10-20)** — T6 y T7 cerrados (S4, S5), con RED observado antes de cada fix.
  Los tres tests nuevos fallaron primero (`no muestra el link…`, `no muestra la ayuda…`,
  `no renderiza el campo de correo`) y después pasaron: **101/101** (antes 99, +3 tests,
  uno reemplazado). `build` (tsc -b) y `lint` (oxlint) limpios.
  - `LoginPage.tsx`: fuera el `EnlaceBoton` a `recuperar` y su `<br/>`, y fuera la
    `ayuda` del campo de identidad. **`RecuperarPage`, `RestablecerPage` y sus rutas
    quedan intactas** — solo dejan de alcanzarse desde el login (decisión de L4).
  - `RegistroPage.tsx`: fuera el `CampoTexto` `registro-correo` completo, y el comentario
    del encabezado ya no habla de un campo deshabilitado que no existe.

- **L6 (2026-10-20)** — T8 y T9 cerrados (S6): prototipo sincronizado, **2 archivos,
  +16/−97**.
  - **HTML** (`R.I.Planta - Diseño retro.html`): `numstat` dio **1/1**, como pide L13 —
    el blob del manifest se reescribió compacto y solo se tocaron las entradas de los
    dos boards (verificado: las otras 8 quedaron byte-idénticas y el orden de claves se
    preservó). Board `Login`: `CORREO ELECTRÓNICO` → `NOMBRE DE USUARIO` (el `<input>` a
    `type="text"` con placeholder `@tu_usuario`) y fuera el `<a href="Recuperar.dc.html">`.
    Board `Crear cuenta`: fuera el bloque de correo. Balance de tags intacto (11/11 y 12/12
    divs). **El board `Recuperar` no se tocó** (sigue vivo).
  - **`.op`**: layout absoluto (`layout: none`), así que quitar bloques obliga a recolocar
    las Y. Login: `p243` pasa a `NOMBRE DE USUARIO`, se elimina `p252`, `p253`/`p254` suben
    y la card pasa de 454.2 a 456.4 de alto, recentrada. Registro: fuera `p266`/`p267`
    (`p268` es hijo de `p267`), todo lo de abajo sube 79.2 y la card pasa de 582 a 501.9,
    recentrada. Gaps verificados contra el original: la separación botón→fila-final del
    login era 49.2 antes y es 47.0 después (el enlace ocupaba ese espacio), y el registro
    conserva todos sus gaps de 17.0/19.8. 10 páginas intactas.
  - Herramientas de un solo uso, **fuera del repo** (`/tmp/opencode/rdd-09793d15/proto/`):
    `editar-html.py` y `editar-op.py`, con el formato de reempaquetado documentado arriba.

- **L7 (2026-10-20)** — **Revisión de lo que vino de la otra máquina** antes de empezar
  (pedido del usuario: "primero revísalos"). Llegó por `git pull --ff-only` hasta
  `e7f4c26`: **35 commits**, 91 archivos, +6206/−627 — routing por URL con History API,
  comentarios en el detalle, detalle unificado en una card, ranking con epitafio,
  `ListaAsesinos`, foto de lápida a disco, coronas idempotentes, e2e con BDs aisladas, y
  cuatro documentos de plan nuevos. El último commit (`e7f4c26 doc`) es **este** plan
  (`limpieza-frontend.md`), sin implementar todavía: verifiqué en el código que el enlace
  seguía en `LoginPage.tsx:41`, la ayuda en `:58` y el campo correo en `RegistroPage.tsx:75`.
  Nada de lo pedido estaba hecho.

- **L8 (2026-10-20)** — Cierre del work unit `b18aaae` (8 archivos, **+77/−121**). Assess de
  RDD desde el boundary revisado (`0e47aba`): `medium` por `executable_change` en el HTML del
  prototipo, 94 paths / 7.633 líneas — pero **`review_due: false`, `under_budget`**: el rango
  incluye los 34 commits de la otra máquina y no alcanza el presupuesto de revisión, así que
  no dispara ciclo nativo. La línea `review-e71bd9f374d851f3` de T1 sigue sellada e intacta.
  Verificación del parent: `101/101` tests, `build` y `lint` limpios, y `git diff --numstat`
  del HTML en **1/1** (el formato de reempaquetado de L13 se sostiene).
  **Riesgo: item 3** — el prototipo es el contrato de referencia del frontend, y este commit
  lo modifica en las dos representaciones.
