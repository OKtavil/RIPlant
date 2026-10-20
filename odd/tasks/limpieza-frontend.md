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
| T1 | S1 | `coronadaPorMi` en el modelo + `quitarCorona` en la API + tests | inline | hecho |
| T2 | S1 | Toggle en `DetallePage`/`GraveCard` + tests | inline | hecho |
| T3 | S2 | `borrar` en `comentarios.api.ts` + botón admin en `ListaComentarios` + tests | inline | hecho |
| T4 | S3 | `subirFoto` en la API + input de archivo en `PublicarPage` + tests | inline | hecho |
| T5 | S3 | Mostrar `fotoUrl` en `GraveCard` y `DetallePage` + tests | inline | hecho |
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

- **L9 (2026-10-20)** — **T1/T2 cerrados (S1)**, commit `a1c1046` (9 archivos, +115/−9).
  Verificación previa contra el código real: **L2 se equivocó** — `coronadaPorMi` **no** estaba
  en el tipo `Grave`, aunque el backend lo devuelve desde `lapidas.service.ts`. El resto sí:
  `DELETE /lapidas/:id/corona` existe (idempotente, filtra por `usuarioId`), y `fotoUrl` ya
  estaba en el modelo.
  - RED observado: 4 tests fallaron primero (`quitarCorona`, y 3 de `GraveCard`).
  - `darCorona` en `App.tsx` pasa a toggle; el backend es idempotente en los dos sentidos, así
    que el estado local no puede desincronizarse por tocar dos veces.
  - Estado visible en `GraveCard` y `DetallePage` vía `aria-pressed` + `aria-label` por estado
    + texto `QUITAR/DAR CORONA`. El icono lleva `stroke` amarillo cuando está puesta (el patrón
    de colores en props ya existía: `InicioPage.tsx:62`).
  - `.lapida__coronas--puesta` y `.detalle__corona--puesta` con el amarillo del sistema.
  - **Fallo propio, corregido**: escribí `GraveCard.test.tsx` con `write` en vez de editarlo y
    **destruí 3 tests que ya existían** (epitafio alto/bajo, username del dueño). Los restauré
    y el diff quedó en +35/−1 (solo el import de `fireEvent`). Los 2 tests de `DetallePage`
    pasaron a la primera porque la implementación ya estaba hecha en el mismo turno: la
    ausencia de RED se verificó retroactivamente contra `HEAD` (`aria-label` viejo), no se
    declaró un RED que no se observó.
  - **108/108** tests, build y lint limpios. Assess desde `5fdb7ef`: `medium`, **`review_due:
    false`, `under_budget`** (9 paths, 124 líneas).
  - Nota de inventario: aparecieron `frontend/vite.config.ts` modificado y
    `frontend/.env.example` sin trackear — **no son de este work unit** (el proxy del túnel de
    `164e7f2`+). Quedaron fuera del commit; el `--expected-untracked-inventory` del assess hubo
    que actualizarlo al hash nuevo (`sha256:12640202…`).
  **Riesgo: item 3** — `Grave.coronadaPorMi` es un campo que consumen varias pantallas, y el
  toggle cambia el significado de tocar el botón en `GraveCard`, usado en grillas e inicio.

- **L10 (2026-10-20)** — **T3 cerrado (S2)**, commit `3ad6060` (5 archivos, **+145/−0**).
  Verificación previa: el backend ya tenía `DELETE /comentarios/:id` detrás de
  `AdminMiddleware`. Dato importante que corrige el supuesto del plan: **el autor no puede
  borrar el suyo** — el middleware exige rol admin, así que la UI solo ofrece el botón a
  admin en vez de mostrar uno que rebotaría `403`.
  - RED observado: 5 tests escritos, **exactamente 3 fallaron** (1 de API + 2 de componente);
    los 2 negativos (no-admin, sin sesión) pasaron a la primera, que es lo correcto porque el
    botón todavía no existía.
  - `comentariosApi.borrar` pega en `/comentarios/:id`, **no** bajo `/lapidas` (el controller
    del backend no lleva prefijo; con el prefijo daría `404`). Esa distinción está en un test
    explícito.
  - El borrado pide **confirmación** (`window.confirm`), siguiendo el patrón ya existente del
    borrado de categoría (`CategoriasPage.tsx:67`): borrar no se deshace y la regla de
    seguridad del usuario pide preguntar antes de operaciones destructivas.
  - RED retroactivo de la confirmación: quité el `if (!window.confirm(...)) return` en una
    copia y **los 2 tests de confirm fallaron** (`no borra nada si el admin cancela`,
    `pregunta antes de borrar`), 113/115. No declaré un RED que no observé: la
    implementación y el test cayeron en el mismo turno.
  - **115/115** tests, build y lint limpios. Assess desde `5fdb7ef`: `medium`,
    **`review_due: false`, `under_budget`** (13 paths, 269 líneas).
  **Riesgo: item 3** — la ruta `/comentarios/:id` es un contrato que solo se verifica contra
  el backend real; un prefijo de más daría `404` silencioso para admin.

- **L11 (2026-10-20)** — **T4/T5 cerrados (S3)**, commit `6322eb3` (11 archivos, **+285/−23**,
  incluye `PublicarPage.test.tsx` nuevo). El formulario mostraba un `AvisoNoDisponible`
  **falso**: el endpoint sí existía hacia rato. Además `fotoUrl` no se dibujaba en ningún lado.
  - RED observado: 5 tests fallaron primero (1 de API `subirFoto` + 4 de `PublicarPage`:
    aviso ausente, input de foto, archivo elegido, tope de 5 MB). Los 3 que pasaron son los
    que ya se cumplían (sin foto → `undefined`, error del padre).
  - `client.ts` suma **`subirArchivo`**: `request` hace `JSON.stringify`, y `FormData` no se
    puede serializar así. El `Content-Type` con `boundary` lo tiene que poner el browser;
    fijarlo a mano dejaría el body ilegible para multer. Hay un test que pinna
    `init.headers === undefined`.
  - Subida en **dos pasos**: `POST /lapidas` → `id` → `POST /lapidas/:id/foto` (campo `foto`).
    El endpoint cuelga del `id`, no se puede mandar la foto en el mismo request.
  - Si la foto falla, **la lápida ya quedó publicada**: se avisa con el mensaje del `ApiError`
    sin revertir y sin dejar la publicación a medias en silencio.
  - El tope de **5 MB** se chequea en el cliente *antes* de crear la lápida, para no publicar
    una lápida y fallar después en la subida. Es el mismo valor de `TAMANIO_MAXIMO_FOTO` del
    backend.
  - `GraveCard` y `DetallePage` muestran `fotoUrl` con `<img>` y caen al placeholder (`IconoHoja`
    + color estable) cuando está vacío. RED retroactivo verificado contra `HEAD`: las dos
    clases `lapida__foto-img`/`detalle__foto-img` no existían (`0` ocurrencias), así que los
    tests nuevos habrían fallado.
  - **125/125** tests, build y lint limpios. Assess desde `5fdb7ef`: `medium`,
    **`review_due: false`, `under_budget`** (16 paths, 577 líneas).
  **Riesgo: item 3** — `onPublicar` cambia de firma (ahora recibe la foto) y es consumido por
  `App.tsx`; y `subirArchivo` es un camino de subida nuevo en el cliente compartido.

- **Nota de inventario (L9/L10/L11)** — `frontend/vite.config.ts` (modificado) y
  `frontend/.env.example` (sin trackear) **no son de esta limpieza**: son el proxy del túnel
  que arrancó en `164e7f2`. Quedaron fuera de los tres work units. El
  `--expected-untracked-inventory` vigente del assess es
  `sha256:12640202d94995e1d8ef1c9304e984f78db137aec3e9301dcca9e86de08cfc15`.
