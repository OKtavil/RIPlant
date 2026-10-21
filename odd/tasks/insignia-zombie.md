# Insignia Zombie: editar una lápida la revive

Rama: `copilot/working-copy` · Entrega: commits por unidad, **sin PR** (el usuario se encarga)
Runner backend: `pnpm --filter backend run test` (Jest) + `run test:e2e` + `run lint`
Runner frontend: `pnpm --filter frontend run test` (Vitest) + `run build` + `run lint`

## Specs

**S1 — Editar una lápida la marca como resucitada.** `PUT /lapidas/:id` (dueño o admin,
ya existe) pasa a ser la señal de vida. La lápida queda con `resucitada: true` y la fecha
del primer rescate en `resucitadaEn`.
- `resucitada` empieza en `false` en toda lápida nueva y en las sembradas.
- `PUT` sobre una lápida ya resucitada **no** cambia `resucitadaEn`: es idempotente, el
  primer rescate es el que cuenta.
- `PUT` que falla la validación (`400`) o cae en `403`/`404` **no** revive nada: la
  revivida ocurre en el mismo `findOneAndUpdate` que aplica la edición.

**S2 — El dueño recibe la insignia `superviviente-zombie`.** Se guarda en el usuario, en
una lista `insignias` (la propuesta del README, decisión abierta #5).
- La insignia la recibe el **dueño de la lápida**, no quien editó: si un admin edita una
  lápida de otro, el premio es del dueño.
- Idempotente: `$addToSet`, así que N lápidas resucitadas del mismo dueño dejan **una**
  entrada en la lista.
- Va en un elemento `{ codigo, lapidaId, obtenidaEn }`: `codigo` es el identificador estable
  (`'superviviente-zombie'`), `lapidaId` dice qué lápida la disparó y `obtenidaEn` cuándo.
- El usuario reservado `zombie` **no** acumula insignias: no es un jugador.

**S3 — `GET /sesiones/actual` y `POST /sesiones` devuelven `insignias`.** El perfil las
consume de la sesión, sin endpoint nuevo ni consulta extra.
- El campo se agrega tal cual al `Usuario` de dominio y a la respuesta de sesión.
- Un usuario sin insignias devuelve `[]`, no `undefined`: el front no tiene que defenderse.
- `passwordHash` sigue sin salir nunca.

**S4 — El perfil muestra la insignia real.** `PerfilPage` deja de mostrar
`AvisoNoDisponible` cuando no corresponde.
- Con la insignia: el slot `perfil__stat--insignia` se marca como obtenida (clase
  `perfil__stat--obtenida`) y el texto dice la fecha en que se obtuvo.
- Sin la insignia: el slot queda apagado y un `Aviso` explica **cómo se obtiene** —
  editar una lápida propia la revive.
- Sin sesión: no se muestra ni se afirma nada sobre insignias ajenas.

**S5 — El detalle y la tarjeta muestran el estado resucitada.** Una lápida resucitada se
distingue a simple vista.
- `DetallePage` muestra el rótulo `RESUCITADA` con `aria-label`.
- `GraveCard` marca la tarjeta con una clase y un rótulo visible.
- `InicioPage` ya no describe la insignia con la frase vieja ("reportada como muerta"): dice
  que se obtiene editando una lápida propia.

**S6 — Documentación alineada.** `README.md`, `docs/spec.md` y `docs/decisions.md` describen
la insignia implementada y la decisión abierta #5 queda cerrada.

## Tasks

| ID | Spec | Tarea | Ruta | Estado |
|----|------|-------|------|--------|
| T1 | S1, S2 | Backend: `resucitada` en el esquema + premio en `update` + tests | inline | pendiente |
| T2 | S3 | Backend: `insignias` en el usuario y en la respuesta de sesión + tests | inline | pendiente |
| T3 | S4, S5 | Frontend: tipo `insignias`, perfil real, estado resucitada + tests | inline | pendiente |
| T4 | S6 | Docs: README, spec y decisiones | inline | pendiente |

## Log

- **L1 (2026-10-20)** — Pedido original del usuario, verbatim:
  *"Con la indignia zombie, puedes tocar backend"*.

- **L2** — **Precisión que cambia el trabajo**: "zombie" son **dos cosas distintas** en este
  proyecto y `pendientes-backend.md:87-88` lo advierte explícitamente.
  - El **usuario reservado `zombie`** (`rol: 'zombie'`) ya está implementado: se siembra,
    hereda las lápidas huérfanas (D-008) y `GET /lapidas/asesinos` lo excluye.
  - La **insignia "Superviviente Zombie"** no existe: no hay campo, ni evento, ni UI real.
    `PerfilPage.tsx:81` muestra un `AvisoNoDisponible` que dice que "todavía no tiene estado
    en la API" — esa frase es **verdadera**, a diferencia del aviso falso de la foto (L2 de
    `limpieza-frontend.md`).
  - Lo pedido es la **insignia**, no el usuario.

- **L3 (2026-10-20)** — Decisión de producto del usuario, vía pregunta explícita: la insignia
  se modela como **"editar la lápida = revive"**.
  - El agujero que había que cerrar: el prototipo dice *"se otorga cuando una lápida
    reportada como muerta vuelve a mostrar señales de vida"*, pero **no existe el estado
    "reportada como muerta"** ni **"señales de vida"** en ningún lado del backend.
  - Opciones presentadas y descartadas: (b) botón explícito "REVIVIÓ" — más auditable pero
    agrega UI y estado, y compite con DAR CORONA y BORRAR en el detalle; (c) modelo de dos
    estados (reportar muerta → revivir) — es lo que la frase sugiere literalmente, pero es
    la opción más cara: dos estados, dos acciones, permisos por estado y quién puede reportar.
  - Elegida (a): reusa el `PUT /lapidas/:id` que ya existe. Costo asumido y aceptado: una
    edición trivial (corregir una tilde) también cuenta como señal de vida.

- **L4** — Diseño derivado de la decisión, antes de escribir código:
  - **Dónde vive el estado**: `resucitada: boolean` + `resucitadaEn: string` en la lápida, no
    en el usuario. El premio es del dueño, pero el **hecho** es de la lápida: una lápida
    resucitada se muestra distinta en el cementerio, y sin el flag en la lápida habría que
    cruzarla contra la insignia del usuario para pintarla.
  - **Dónde vive la insignia**: lista `insignias` en `usuarios`, como propone el README
    (decisión abierta #5). Se lee de la sesión, así que el perfil no necesita endpoint nuevo.
  - **Idempotencia**: `$addToSet` para la insignia y `resucitadaEn: lapida.resucitadaEn ?? ahora`
    para la fecha. Editar diez veces deja una insignia con la fecha del primer rescate.
  - **Quién la recibe**: el dueño (`lapida.usuarioId`), no `req.sesion.usuario.id`. Un admin
    que edita la lápida de otro no se lleva el premio, y el dueño sí.
  - **El usuario `zombie` queda excluido** porque no puede editar (no puede iniciar sesión) y
    porque las lápidas huérfanas son suyas sin que él haya hecho nada.

- **L5** — Verificación previa de la infraestructura, antes del RED: Mongo responde en
  `mongodb://localhost:27018/riplanta` (el contenedor de `docker-compose.yml`), así que los
  e2e corren de verdad y no hace falta mockear la base. `GET` de usuarios **no existe**: la
  insignia solo puede salir por la sesión, que es justamente S3.
