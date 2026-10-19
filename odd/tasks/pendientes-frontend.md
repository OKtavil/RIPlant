# Plan: los pasos que faltan en el frontend

Objetivo: dejar registradas, con evidencia file:line, las brechas del frontend respecto de
docs y backend, su dependencia y su orden de trabajo. **No hay implementación todavía**:
este documento es el insumo de las features frontend que vienen.

Rama: `copilot/working-copy` (worktree `riplant-copilot-working-copy`).
Contraparte: `odd/tasks/pendientes-backend.md` — la vista de backend de estas mismas brechas
(S1, S3, S4 y S5 ahí definen los contratos que el frontend va a consumir). Origen del hallazgo:
la brecha ya detectada en `frontend-prototipo.md` S10 (E3) más la auditoría de contrato
front ↔ docs ↔ backend del 2026-10-19.
Runner de verificación hoy: `pnpm --filter frontend run build` y `pnpm --filter frontend run lint`
(oxlint). **No existe test runner en el frontend** (ver S1).

## Specs

### S1 — Tests unitarios del frontend (único paso sin dependencias)

Requisito de `docs/spec.md:44`, texto literal: "Las pruebas cubren el camino feliz y los
errores HTTP principales."

Hoy: cero archivos `*.test.*` en `frontend/` y ningún script de test en
`frontend/package.json:6-11`. Es el único trabajo de este plan que no depende del backend.
Falta decidir el runner (asunción, no decisión: **vitest**, el estándar junto a Vite).

### S2 — Conectar las pantallas ya construidas cuando el backend entregue cada endpoint

Las pantallas existen con la regla de `frontend-prototipo.md` S10: "nunca inventar datos ni
simular guardado", quedan deshabilitadas con aviso. Cada fila se destraba habilitando el
campo y conectando el handler:

| Pantalla | Evidencia | Aviso en código (literal) | Contrato que espera |
|---|---|---|---|
| Crear cuenta | `RegistroPage.tsx:29-42` | "El registro todavía no tiene endpoint en el backend." | `POST /usuarios` de `pendientes-backend.md` S3 (con auto-login) |
| Recuperar contraseña | `RecuperarPage.tsx:18-24` | "La recuperación de contraseña todavía no tiene endpoint en el backend." | `pendientes-backend.md` S1 |
| Nueva contraseña | `RestablecerPage.tsx:25-34` | "El cambio de contraseña todavía no tiene endpoint en el backend." | `pendientes-backend.md` S1 |
| Comentarios | `DetallePage.tsx:56` | "Los comentarios todavía no tienen endpoint, así que no se pueden leer ni escribir." | `pendientes-backend.md` S1 |
| Subir foto | `PublicarPage.tsx:48-54` | "La subida de fotos todavía no tiene endpoint. La lápida se publica sin imagen." | `pendientes-backend.md` S1 |
| Editar perfil | `PerfilPage.tsx:38` | "Editar perfil todavía no tiene endpoint" | sin contrato en el plan de backend todavía |

Estado: **bloqueado por backend** (el usuario confirmó el 2026-10-19 que se está trabajando
en él). Se abre una tarea por fila cuando el endpoint correspondiente exista.

### S3 — Asesinos Seriales y contador de plantas asesinadas por usuario

`InicioPage.tsx:62`, `RankingPage.tsx:76` y `PerfilPage.tsx:68` muestran aviso: "La API
todavía no expone un contador de plantas asesinadas por persona." / "…todavía no existe en
la API."

Requiere **endpoint nuevo** en el backend (incluido en `pendientes-backend.md` S1 como
"asesinos seriales"). Mientras no exista, el front no puede calcularlo de forma confiable
salvo agregando en cliente, que sería simular la capacidad.

### S4 — Borrar lápidas desde la UI (y el caso de la edición)

`PUT` y `DELETE /lapidas/:id` ya existen y están probados en el backend, pero
`lapidas.api.ts:12-16` no tiene **ningún call site**: no hay pantalla que borre o edite
una lápida. Hoy ninguna decisión de producto lo pide, pero el backend en curso lo acerca:
`pendientes-backend.md` S4 define "cada usuario puede borrar su propia lápida, el admin puede
con todas" — cuando eso aterrice, el perfil o el detalle van a necesitar el botón de borrar.

Riesgo técnico a resolver si hay UI de edición: `lapidas.api.ts:12` tipa el body como
`Partial<CreateGraveInput>` pero el backend valida `CreateLapidaDto` completo con
`forbidNonWhitelisted` (`lapidas.controller.ts:33-39`): **un PUT parcial hoy devuelve 400**.
Alinear el tipo con lo que el backend termine exigiendo antes de escribir la UI.

Decisión abierta: si **editar** lápida entra al prototipo (las 5 pantallas no lo contemplan).

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
| T1 | S1 | inline | pendiente (sin dependencias; falta decidir runner) | — |
| T2 | S2 | inline | bloqueado por backend (una tarea por fila al llegar cada endpoint) | — |
| T3 | S3 | inline | bloqueado por endpoint de conteo en backend | — |
| T4 | S4 | inline | pendiente de decisión (borrar propio al aterrizar S4 del backend; editar = decisión de producto) | — |
| T5 | S5 | inline | decisión abierta (routing por URL) | — |
| T6 | S6 | inline | decisión abierta + esquema backend | — |
| T7 | S7 | inline | decisión abierta + definición backend | — |

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
