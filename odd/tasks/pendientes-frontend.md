# Plan: los pasos que faltan en el frontend

Objetivo: dejar registradas, con evidencia file:line, las brechas del frontend respecto de
docs y backend, su dependencia y su orden de trabajo. **T1 (S1) ya está implementado**;
el resto sigue esperando endpoints del backend o decisiones de producto.

Rama: `copilot/working-copy` (worktree `riplant-copilot-working-copy`).
Contraparte: `odd/tasks/pendientes-backend.md` — la vista de backend de estas mismas brechas
(S1, S3, S4 y S5 ahí definen los contratos que el frontend va a consumir). Origen del hallazgo:
la brecha ya detectada en `frontend-prototipo.md` S10 (E3) más la auditoría de contrato
front ↔ docs ↔ backend del 2026-10-19.
Runner de verificación hoy: `pnpm --filter frontend run test` (Vitest 5),
`pnpm --filter frontend run build` y `pnpm --filter frontend run lint` (oxlint).

## Specs

### S1 — Tests unitarios del frontend (único paso sin dependencias)

Requisito de `docs/spec.md:44`, texto literal: "Las pruebas cubren el camino feliz y los
errores HTTP principales."

Estado 2026-10-19: **implementado** (T1). Runner **Vitest 5.0.5** con `jsdom` y
`@testing-library/react`/`@testing-library/dom` como devDependencies; scripts `test` y
`test:watch` en `frontend/package.json`; config en `vite.config.ts` (`environment: 'jsdom'`,
`globals: true`). Cobertura: cliente HTTP (camino feliz, los 6 estados de error y caída de
red), los tres módulos de API (paths, métodos y bodies) y un smoke de `LoginPage`.

### S2 — Conectar las pantallas ya construidas cuando el backend entregue cada endpoint

Las pantallas existen con la regla de `frontend-prototipo.md` S10: "nunca inventar datos ni
simular guardado", quedan deshabilitadas con aviso. Cada fila se destraba habilitando el
campo y conectando el handler:

| Pantalla | Evidencia | Aviso en código (literal) | Contrato que espera |
|---|---|---|---|
| Crear cuenta | `RegistroPage.tsx` | — (conectada, ver T8) | `POST /usuarios` de `pendientes-backend.md` S3 (con auto-login) — **entregado** |
| Recuperar contraseña | `RecuperarPage.tsx:18-24` | "La recuperación de contraseña todavía no tiene endpoint en el backend." | `pendientes-backend.md` S1 |
| Nueva contraseña | `RestablecerPage.tsx:25-34` | "El cambio de contraseña todavía no tiene endpoint en el backend." | `pendientes-backend.md` S1 |
| Comentarios | `DetallePage.tsx:56` | "Los comentarios todavía no tienen endpoint, así que no se pueden leer ni escribir." | `pendientes-backend.md` S1 |
| Subir foto | `PublicarPage.tsx:48-54` | "La subida de fotos todavía no tiene endpoint. La lápida se publica sin imagen." | `pendientes-backend.md` S1 |
| Editar perfil | `PerfilPage.tsx:38` | "Editar perfil todavía no tiene endpoint" | sin contrato en el plan de backend todavía |

Estado: **bloqueado por backend** (el usuario confirmó el 2026-10-19 que se está trabajando
en él). Se abre una tarea por fila cuando el endpoint correspondiente exista.

### S3 — Asesinos Seriales y contador de plantas asesinadas por usuario

`GET /lapidas/asesinos` **ya existe** (`pendientes-backend.md` S7, entregado como T6 del
backend) y devuelve `[{ username, muertes }]`, agrupado por `usuarioId` y ordenado de mayor a
menor, con el nombre resuelto contra `usuarios.username`.

Estado 2026-10-19: **implementado** (T9). `InicioPage`, `RankingPage` y `PerfilPage` consumen el
endpoint vía `lapidasApi.asesinos()` y un componente compartido `ListaAsesinos` (variantes
`sidebar` y `fila`).

El cálculo anterior en cliente agrupaba por `lapida.autor`, que es **texto libre**, y daba
cuentas falsas: sobre los datos reales producía `Jardinera 3, Rosa Verde 3, Tito Maceta 2,
Anónimo 1, Desconocido 1` cuando la cuenta verdadera es `jardinera 4, admin 2`. Por eso el
ranking dejó de calcularse en cliente. Ese fue un bug de datos, no una capacidad faltante: el
aviso de "no disponible" convivía con una lista que ya mostraba números inventados.

Identidad: `PerfilPage` filtra las lápidas propias por `duenio.username` (resuelto por el
backend) y **no** por `autor`.

### S4 — Borrar lápidas desde la UI (y el caso de la edición)

`PUT` y `DELETE /lapidas/:id` ya existen y están probados en el backend, y
`lapidasApi.remove` ya tenía el método — pero **ningún call site**: no había forma de
borrar desde la UI.

Estado 2026-10-20: **implementado** (T4). El control está en `DetallePage` (botón
`BORRAR ESTA LÁPIDA`, variante `peligro`) y en las tarjetas del perfil
(`GraveCard` con `onBorrar`), visible solo cuando `puedeBorrar()` lo permite: el dueño
o un admin, espejando `dueno-o-admin-lapida.middleware.ts`.

Dos hallazgos al implementar:

1. **El prototipo no tiene este botón en ninguna pantalla.** Los `EDITAR`/`ELIMINAR`
   del `.op` son todos de la página "Categorías (CRUD)", que ya estaba hecha. El
   detalle de lápida solo tiene `DAR CORONA`, `COMENTARIOS` y el campo de comentario.
   Se agregó por decisión explícita del usuario. El prototipo se actualizó después,
   en `325bff3`: botón `BORRAR ESTA LÁPIDA` en el detalle, con el rojo del sistema
   (`#C0392B`), en las dos representaciones (`.op` y el HTML empaquetado).
2. **`POST /lapidas` y `POST /lapidas/:id/corona` no devuelven `duenio`**; solo
   `GET /lapidas` lo enriquece. Comparar por `duenio.username` hacía que el botón
   desapareciera al publicar una lápida o al darle una corona. `puedeBorrar()`
   compara además por `usuarioId` contra `sesion.id`, que se verificó contra el
   backend real que son el mismo ObjectId.

Bug de identidad corregido de paso: `DetallePage:28` y `GraveCard:39` mostraban
`lapida.autor` (texto libre) en vez del dueño real. En los datos reales hay lápidas
con `autor: "Anónimo"` cuyo dueño es `@zombie`. Ahora usan `nombreDelDuenio()`.

**Sigue abierta** la decisión de si **editar** lápida entra al prototipo, y el riesgo
técnico asociado: `lapidas.api.ts:12` tipa el body del `PUT` como
`Partial<CreateGraveInput>` pero el backend valida `CreateLapidaDto` completo con
`forbidNonWhitelisted` — un PUT parcial hoy devuelve 400.

### S5 — Detalle por `GET /lapidas/:id`

`lapidas.api.ts:7` definido con cero call sites; `DetallePage` se arma del estado en memoria
que `App.tsx` ya cargó. Funciona en el flujo actual. Solo hace falta si se agrega **routing
por URL** (deep link o recarga en el detalle): decisión abierta, sin pedido del usuario.

### S6 — Insignia Zombie

`README.md` decisión abierta #5: falta el estado "reportada como muerta" y dónde guardar las
insignias (propuesta: una lista `insignias` en el usuario). El slot de CSS ya existe
(`perfil__stat--insignia`, `PerfilPage.tsx:57`). Depende de esquema nuevo en backend +
decisión de producto.

### S7 — Borrar categoría en uso

`README.md` decisión abierta #8: si hay lápidas que la usan, impedir el borrado o quitarla de
esas lápidas. Arrastra UI (mensaje de error o confirmación) y una definición del backend.

## Tasks

| ID | S# | Ruta | Estado | Commit |
|---|---|---|---|---|
| T1 | S1 | inline | hecho 2026-10-19 — 28 tests verdes (RED/GREEN en L6) + build + lint + verificación sin blockers (L7); review RDD APPROVED con authority burned (L8) | `0e47aba` |
| T2 | S2 | inline | en curso: Crear cuenta conectada (T8); el resto de las filas sigue bloqueado por backend | `022c150` |
| T3 | S3 | inline | hecho 2026-10-19 — asesinos con datos reales del endpoint (L10); cierra junto con T9 | `cb97920` |
| T4 | S4 | inline | hecho 2026-10-20 — borrar propio/admin en detalle y perfil + fix de identidad (L12); prototipo pendiente | `6dee621` |
| T5 | S5 | inline | decisión abierta (routing por URL) | — |
| T6 | S6 | inline | decisión abierta + esquema backend | — |
| T7 | S7 | inline | decisión abierta + definición backend | — |
| T8 | S2 | inline | hecho 2026-10-19 — registro conectado y verificado contra el backend real (L9) | `022c150` |
| T9 | S3 | inline | hecho 2026-10-19 — `GET /lapidas/asesinos` consumido en las tres pantallas (L10) | `cb97920` |

## Log

- **L1 (2026-10-19)** — Petición original: "Puedes analalizar el front end del proyecto, es
  decir que coincida con los docs y el backend en su mayoria sin modificar el backend?"
- **L2 (2026-10-19)** — Corrección sobre demo: "Cambia la documenteacion entonces, no hay que
  tener datos demo, deben de ser mocks para las pruebas, asi que estan bien como es en app.tsx"
  → aplicado en commit `22b0d3c` (docs alineados; nueva D-007 en `docs/decisions.md`).
- **L3 (2026-10-19)** — Contexto del usuario: "Se esta trabajando en el backend, asi que esta
  bien, ahora sin embargo, que pasos faltarian en el frontend? hay algun flujo que falte
  implementar?"
- **L4 (2026-10-19)** — "si" → registro de este plan.
- **L5** — Evidencia de la auditoría: 8 hallazgos (F1 PUT parcial vs DTO completo; F6
  `findById`/`update`/`remove` sin call sites; drift doc en spec.md:42, README:16-18 y
  architecture.md:65 — todos corregidos en `22b0d3c`). Corrección: la decisión abierta #2 del
  README ("Publicar no tiene causa de muerte") **ya está resuelta en código**
  (`PublicarPage.tsx:19,34,100` envía `causaMuerte`); `pendientes-backend.md` S2 además la vuelve
  opcional en el backend.
- **L6 (2026-10-19)** — T1 implementado inline: decisión de runner **vitest** (la asunción de
  S1) más `jsdom`, `@testing-library/react` y `@testing-library/dom` como devDependencies.
  5 archivos de test / 28 tests. Primera ejecución: 7 fallos — el test asertaba la propiedad
  `mensaje` de `ApiError` y la correcta es `message` (hereda de `Error`); corregido, verde
  total. `build` (tsc + vite) y `lint` (oxlint) verdes; lint probado con un archivo malicioso
  en `/tmp` para confirmar que reporta hallazgos cuando los hay. Comandos documentados en
  README.md, docs/README.md y docs/verification.md. Veredicto de riesgo: **item 5** (nuevas
  devDependencies).
- **L7 (2026-10-19)** — Verificador independiente (`gentle-ai-verify`) sobre el diff completo
  de T1: **S1 MET, cero blockers**, 4 advisories (cobertura de `credentials` en DELETEs, aviso
  de auto-install de pnpm en CI, warnings de oxlint no bloquean (preexistente) e historial de
  proceso no reproducible). Pruebas propias del verificador en scratch: verde 28/28, typecheck
  de tests confirmado con error inyectado, `dependencies` intacto (solo react/react-dom),
  `dist` sin rastros de tooling de test, lockfile +554/−0 y `--frozen-lockfile` en verde, peers
  limpios con vite 8 / React 19 / TS 6. Spot check del parent tras la verificación: 28/28.
- **L8 (2026-10-19)** — T1 commiteado como `0e47aba`. RDD global evaluó el candidato desde el
  branch point `6650cdd` (101 paths, 28.850 líneas) como `high_risk`, pero el review nativo lo
  rechazó con `lens_context_budget_exceeded` y ordenó partirlo en candidados más chicos. Se
  acotó al work-unit propio (`--base-ref 398ce55`, 12 paths, 955 líneas), que quedó `high_risk`
  por `configuration_change` en `frontend/package.json` + item 5; consentimiento relayado al
  usuario (granted) y ciclo iniciado con la línea `review-e71bd9f374d851f3`. Lentes congeladas:
  risk, readability, reliability. Las tres lentes volvieron con cero hallazgos causales por
  candidato (~10 WARNING/SUGGESTION, todos advisories no bloqueantes). **Ciclo cerró APPROVED
  con `authority: burned`** (línea `review-e71bd9f374d851f3`). Advisory: fixture `admin`/`riplanta123`
  en texto plano (`sesiones.api.test.ts:36`) — **cerrado en L11** tras verificarlo a fondo.
  Mientras corría el review, la otra sesión commiteó `44ac10b`
  (backend `/lapidas`) y movió HEAD, pero no tocó esta línea ya aprobada.
- **L9 (2026-10-19)** — **T8 (S2, fila Crear cuenta) hecho**: `POST /usuarios` aterrizó en el
  backend con auto-login (`usuarios.controller.ts:23-52`), así que la pantalla se conectó
  (`RegistroPage.tsx` + `sesionesApi.registrar` + `registrar()` en `App.tsx`). Hallazgo al
  implementar: el cliente HTTP **no clasificaba el 409**, que es justo el que devuelve el
  registro con un nombre repetido; sin `case 409` un duplicado mostraba "Ocurrió un error
  inesperado". Se agregó el código `conflicto` a `ApiError` y a `clasificar()`. El correo sigue
  deshabilitado a propósito (el backend no guarda email y el registro no lo pide: no se simula).
  Verificación contra el backend real (`:3000`, Mongo `:27018`, ambos reiniciados por esta
  sesión tras encontrarlos caídos): `201` con `Set-Cookie: riplanta_sesion=...; HttpOnly;
  SameSite=Lax` y sesión vigente en `GET /sesiones/actual`; duplicado `409`; contraseña corta
  `400` con "La contraseña debe tener al menos 8 caracteres"; y un `rol: "admin"` inyectado en
  el cuerpo **se ignora** (la respuesta devuelve `rol: "usuario"`). Datos de prueba revertidos
  (2 usuarios borrados de Mongo; el de contraseña corta nunca se insertó). 36 tests, `build` y
  `lint` en verde. Commit `022c150`, 7 archivos, +192/−18. Veredicto de riesgo: **item 3**
  (el `ApiError` es una superficie que consume toda la app). La otra sesión commiteó `e1edbae`
  mientras trabajaba; se stagearon solo los 7 archivos propios y sus 2 quedaron intactos.
- **Nota de coordinación (2026-10-19)** — Este trabajo se hizo en el mismo worktree que la
  sesión de backend. Regla aplicada: stagear **solo** los archivos propios, nunca `git add -A`,
  y verificar el contenido del commit antes de cerrarlo. HEAD se movió dos veces en esta sesión
  (`593ccbf`, `e1edbae`) sin conflicto.
- **L10 (2026-10-19)** — **T3/T9 (S3) hechos**: `GET /lapidas/asesinos` ya existía (el backend
  lo entregó como su T6, ver `db16f63`), así que las tres pantallas se conectaron vía
  `lapidasApi.asesinos()` + el componente compartido `ListaAsesinos` (variantes `sidebar` para
  la barra de Inicio y `fila` para Ranking y Perfil). **Hallazgo principal**: el ranking que ya
  se mostraba en `RankingPage` estaba **mal calculado**, no ausente. Agrupaba por `lapida.autor`
  (texto libre) mientras el endpoint agrupa por `usuarioId` y resuelve contra
  `usuarios.username`; sobre los datos reales el cálculo viejo daba cinco usuarios falsos
  (`Jardinera 3, Rosa Verde 3, Tito Maceta 2, Anónimo 1, Desconocido 1`) contra la cuenta real
  `jardinera 4, admin 2`. Es decir: un aviso de "no disponible" conviviendo con números
  inventados. También se corrigió `PerfilPage`, que identificaba las lápidas propias por
  `autor`; ahora usa `duenio.username` y su stat sale del ranking real. Verificación contra el
  backend real con un render SSR desechable (borrado después, sin quedar en el worktree):
  puestos `["1. @jardinera","2. @admin"]`, valores `["4","2"]`, y ni "Rosa Verde" ni "Anónimo"
  aparecen. 42 tests, `build` y `lint` en verde. Commit `cb97920`, 9 archivos, +225/−47.
  Veredicto de riesgo: **item 3** (`Grave` cambia de forma y la consumen las tres pantallas del
  feature).
- **L11 (2026-10-20)** — **Advisory del fixture cerrado**. Se verificó a fondo y el diagnóstico
  original era impreciso: **no había credencial filtrada** por un descuido, sino un default de
  desarrollo deliberado. `riplanta123` es el fallback documentado de
  `usuarios.service.ts:48` (solo fuera de producción, avisado por log) y aparece en el README.
  El repo `origin` es `github.com/OKtavil/RIPlant` y es **privado** (confirmado con `gh`), así
  que la exposición en `origin/copilot/working-copy` (commits `1ae7143`, `0e47aba`, `335a7db`)
  queda restringida a quien ya tiene acceso. Búsqueda completa: 17 apariciones en el working
  tree — 1 `.env` (ignorado), 1 test del backend (legítimo: verifica el fallback), 8 de relleno
  en tests del frontend (corregidas), 3 de documentación, y 1 en este mismo doc.
  **Hecho**: (a) los 8 rellenos del frontend pasaron a `clave-de-prueba`; (b) `backend/.env`
  rotado a una contraseña aleatoria de 20 caracteres — el `.env` no cumplía su función si
  repetía el valor que ya está público en el repo; (c) hallazgo nuevo: `backend/.env.example`
  **no listaba** `ADMIN_PASSWORD` ni `ADMIN_USERNAME`, así que quien clonaba el repo no
  descubría que existían y terminaba usando el default sin saberlo. **Pendiente**: el arreglo de
  `.env.example` no se pudo escribir (el entorno bloquea escritura en archivos `.env*`); queda
  el contenido propuesto en la conversación para aplicación manual. Commit `3d59227`, 3
  archivos, +11/−11. Veredicto de riesgo: **item 5** (se tocó configuración de entorno).
- **L12 (2026-10-20)** — **T4 (S4) hecho**: borrar la propia lápida. `DELETE /lapidas/:id`
  ya existía pero sin call site. Se agregó el control en el detalle y en las tarjetas del
  perfil, condicionado por `puedeBorrar()` (dueño o admin, espejo del middleware). Dos
  hallazgos: (a) **el prototipo no tiene este botón en ninguna pantalla** — los
  `EDITAR`/`ELIMINAR` del `.op` son todos de Categorías; se agregó por decisión explícita
  del usuario y **reflejado después en el HTML y el `.op`** (commit `325bff3`; en el
  commit original no se tocaron para no pisar a la sesión de backend, que tenía
  `riplanta.op` abierto y en ese momento estaba agregando `POST /lapidas/:id/foto`
  con 10 archivos de backend modificados);
  (b) **`POST /lapidas` y `POST /corona` no devuelven `duenio`** — comparar solo por
  `duenio.username` hacía desaparecer el botón al publicar o coronar, así que
  `puedeBorrar()` compara además por `usuarioId` contra `sesion.id`. Bug de identidad
  corregido de paso: `DetallePage:28` y `GraveCard:39` mostraban `autor` (texto libre) en
  vez del dueño real; ahora usan `nombreDelDuenio()`. Verificación contra el backend real:
  tercero → 403 y la lápida sobrevive; dueño → 200 y después 404; `sesion.id` y
  `usuarioId` confirmados como el mismo ObjectId. 58 tests, build y lint en verde. Commit
  `6dee621`, 8 archivos, +295/−10. Veredicto de riesgo: **item 3** (`puedeBorrar` codifica
  una regla de permisos que varias pantallas consumen).
- **L13 (2026-10-20)** — **prototipo actualizado con el botón de borrar** (S4). El `.op`
  pasó a ser de esta sesión por decisión del usuario ("no encontré el agente que lo usaba").
  Primero se commiteó el ajuste que estaba sin commitear: `p77` (panel "Insignia especial:
  Superviviente Zombie" de la página Inicio) bajaba de 70 a 51.1 de alto, para que el texto
  de dos líneas dejara de desbordar — solo geometría, commit `2677689`.
  Después, el botón: `.op` con un frame nuevo `p362` clonado de la geometría de `p176`
  (`DAR CORONA`), y el HTML con el botón como hermano de la caja de comentarios, dentro de
  la columna de info (que es `flex-direction: column; gap: 14px`, así que cae debajo sin
  romper nada). Texto `BORRAR ESTA LÁPIDA`, color del sistema `#C0392B` = `--rojo`.
  **Hallazgo de tooling importante**: el HTML de referencia **no contiene el diseño** — es
  un contenedor de 10 `<section class="board">`, cada uno con un `<iframe src="about:blank#<uuid>">`.
  Los diseños viven en un `<script type="__bundler/manifest">` de una sola línea (1.45M de
  chars, línea 476): JSON → base64 → gzip → HTML. Para editarlo hay que desempacar la
  entrada del uuid, editar y reempaquetar con el mismo formato. **Trampa**: el `json.dump`
  por defecto (o `indent=1`, o un `\n` final) reescribe el archivo entero — el diff pasó de
  45 líneas a 7.421 inserciones/7.376 borrados. El formato correcto es `indent=2` **sin**
  newline final. Verificado tras el arreglo: solo cambió la entrada del detalle
  (`15d196a6...`); las otras 9 quedaron idénticas, y el balance de tags del board sigue
  cerrado (19/19 divs, 2/2 buttons). Commit `325bff3`, 2 archivos, +46/−1. Riesgo: **item 3**
  (el prototipo es el contrato de referencia del frontend).
