# Feature: frontend fiel al prototipo retro (React + Vite, scream architecture)

Objetivo: reemplazar el scaffold actual del frontend por las 10 pantallas del prototipo
`R.I.Planta - Diseño retro.html`, con estética retro pixelada exacta, conectadas a la API
real del backend donde existe soporte.

Rama: `copilot/working-copy` (worktree `RIPlant-worktree`).
Estrategia de entrega: `single-pr` por work units (≤ ~400 líneas autoradas por commit).
Runner de tests: `pnpm --filter frontend build` (tsc -b && vite build) + `pnpm --filter frontend lint` (oxlint).
No hay runner de tests unitarios en el frontend todavía: la verificación funcional es build + lint + prueba manual contra la API real.

Fuente de verdad del diseño: `R.I.Planta - Diseño retro.html` (10 boards, export del original).
Complemento: `riplanta.op` (adaptación a OpenPencil; NO incluye todas las opciones).
Respaldos a ignorar: `riplanta copy.op`, `riplanta.bk.op`.

## Specs

### S1 — Sistema de diseño retro (tokens exactos del prototipo)

Los tokens salen del prototipo y se usan tal cual. Paleta:

| Token | Valor | Uso |
|---|---|---|
| `--fondo` | `#F2B87A` | fondo de pantalla (peach) |
| `--panel` | `#2E1305` | paneles oscuros y barra de navegación |
| `--borde-panel` | `#150800` | borde de los paneles oscuros |
| `--inset-panel` | `#6E3A12` | anillo interior (box-shadow inset 0 0 0 2px) |
| `--madera` | `#8B4513` | sidebar de rankings, cabecera de perfil, bordes de tarjeta |
| `--crema` | `#F5E0B8` | tarjetas y formularios |
| `--menta` | `#DCF2E9` | fondo de imagen de lápida, avatar, tarjetas de cementerio |
| `--amarillo` | `#E8C547` | acentos de texto en paneles oscuros |
| `--rojo` | `#C0392B` | acción destructiva, contadores de asesinos seriales |
| `--texto` | `#3B2A1A` | texto principal sobre fondo claro |
| `--texto-suave` | `#4A4A4A` | texto secundario |
| `--muted-panel` | `#6E3A12` | texto secundario sobre crema |
| `--acento-dorado` | `#C9924F` | iconos de corona |
| `--verde-insignia` | `#2E7D5B` | icono de la insignia Zombie |

Colores de "foto" de lápida (placeholder cromático del prototipo): `#7CB342`, `#C0392B`,
`#E8B94A`, `#6C8E4E`, `#9B7EDE`.

Botón primario: gradiente `linear-gradient(#E3C583, #C9924F)`, borde `3px solid #6E3A12`,
`border-radius: 8px`, texto `#2E1305` en `Press Start 2P`. Estado hover/activo del `.op`:
fondo `#D6AB69` con borde `2px #6E3A12` / `3px #6E3A12` según tamaño.

Botón destructivo: fondo `#C0392B`, borde `2px solid #2E1305`, texto `#F5E0B8`.

Tipografías: `Press Start 2P` (títulos y botones, 8–16px) y `Space Mono` (cuerpo, 10–13px),
ambas desde Google Fonts.

Inputs: `font-family: Space Mono`, `12px`, `width: 100%`, `padding: 10px`,
`border: 2px solid #8B4513`, `border-radius: 6px`, `background: #ffffff`, color `#3B2A1A`.
Labels: `11px`, `font-weight: 700`, `display: block`, `margin-bottom: 6px`.

Contenedores: pantalla `1280x900` de referencia con `padding: 24px`, `display:flex`,
`flex-direction: column`, `gap: 18px`; se adapta a viewport real sin scroll horizontal.

### S2 — Barra de navegación

Panel `#2E1305`, borde `3px #150800`, `radius 10px`, `padding 14px 22px`,
`box-shadow: inset 0 0 0 2px #6E3A12`. Logo `R.I.PLANTA` en `Press Start 2P 16px` color `#E8C547`.

Ítems: `INICIO`, `RANKING`, `PUBLICAR` (y `CATEGORÍAS` en la pantalla de Categorías),
en `Press Start 2P 10px`; ítem activo color `#E8C547`, resto `#F5E0B8`, `gap: 26px`.

Las 4 pantallas de autenticación **no** muestran navegación: solo el panel con el logo.

### S3 — Pantalla Inicio (cementerio + sidebar)

Layout: columna con nav + fila `flex` de dos bloques (feed `flex: 1.7`, sidebar `flex: 1`).

Feed: cabecera `CEMENTERIO DE PLANTAS` (`Press Start 2P 13px #E8C547` sobre panel oscuro),
grilla `repeat(3, 1fr)`, `gap: 14px`.

Tarjeta de lápida: fondo `#DCF2E9`, `border: 3px solid #ffffff`, `outline: 2px solid #8B4513`,
`radius 8px`, `padding: 10px`, `gap: 6px`. Contiene: bloque de imagen `height: 84px`,
`radius 6px`, con color variable y hoja SVG; título comillado `12px/700 #2E1305`;
categoría · causa `10px #4A4A4A`; autor `10px #8B4513`; corona con contador `11px #8B4513`.

Última celda de la grilla: tarjeta punteada `border: 3px dashed #8B4513` con `+` y
`Publica tu lápida`, que navega a Publicar.

Sidebar: fondo `#8B4513`, `border: 3px solid #150800`, `radius 10px`, `padding: 16px`.
Dos secciones, cada una con cabecera oscura (`SALÓN DEL HONOR` / `ASESINOS SERIALES`,
`Press Start 2P 10px #E8C547`) y lista sobre `#F5E0B8` (`radius 6px`, `padding 12px`,
`11px`), mostrando top 3 con posición, nombre y contador. Al final, la nota de la insignia:
`Insignia especial: "Superviviente Zombie" — se otorga cuando una lápida reportada como
muerta vuelve a mostrar señales de vida.` con `Superviviente Zombie` en `#C0392B 700`.

### S4 — Pantalla Ranking

Dos columnas `flex: 1`, `gap: 18px`. Cada columna: cabecera oscura
(`SALÓN DEL HONOR` / `ASESINOS SERIALES`, `Press Start 2P 12px #E8C547`), subtítulo
`10px #6E3A12` (`Ordenado por coronas recibidas` / `Ordenado por lápidas publicadas`),
y filas: fondo `#F5E0B8`, `border: 3px solid #8B4513`, `radius 8px`, `padding: 14px`,
con `flex` entre texto (position + nombre `13px/700`, autor · categoría `10px #6E3A12`)
y contador (`13px`).

Salón del Honor ordena por `coronasCount` desc y muestra corona `#C9924F`.
Asesinos seriales ordena por cantidad de lápidas publicadas por autor y muestra el
contador en `#C0392B`.

### S5 — Pantalla Publicar

Columna centrada. Tarjeta `width: 640px`, fondo `#F5E0B8`, `border: 3px solid #8B4513`,
`radius 12px`, `padding: 28px`, `gap: 16px`. Título `NUEVA LÁPIDA`
(`Press Start 2P 13px #2E1305`).

Campos, en este orden, con los textos exactos del prototipo:

1. `Foto de la planta` — zona punteada `border: 3px dashed #8B4513`, `radius 8px`,
   `padding 24px`, con icono `+` y el texto `Arrastra una imagen o toca para subir`.
2. `Nombre de la planta` — input con placeholder `Ej. Pepino`.
3. Fila `flex gap 14px`: `Categoría` (select con las categorías reales de la API) y
   `Fecha de fallecimiento` (`type="date"`).
4. `Epitafio` — textarea `rows=4` con placeholder `Escribe unas palabras de despedida...`.
5. Botón `PUBLICAR LÁPIDA` (estilo primario, `Press Start 2P 11px`).

Además, y fuera del prototipo original, un campo obligatorio `Causa de muerte`
(`input text`, placeholder `Ej. exceso de agua`), porque `CreateLapidaDto` la exige y sin
ella la publicación responde `400`. Esta desviación se registra en el Log.

### S6 — Pantalla Detalle de lápida

Dos columnas: izquierda `flex: 1.1` panel `#8B4513` (`border: 3px solid #150800`,
`radius 12px`, `padding: 16px`) con bloque de imagen `#DCF2E9` de `height: 320px` y
centrado, y debajo el epitafio en tarjeta `#F5E0B8` (`radius 8px`, `padding: 16px`,
`12px`, `line-height 1.6`, comillado).

Derecha `flex: 1`, `gap: 14px`: título en mayúsculas comillado `Press Start 2P 14px #2E1305`;
autor `por @usuario` (`11px #8B4513`); tarjeta de datos `#F5E0B8` (`border: 2px solid #8B4513`,
`radius 8px`, `padding: 12px`, `11px`) con `Categoría:`, `Causa de muerte:` y
`Fecha de fallecimiento:` (formato `dd/mm/aaaa`); botón `DAR CORONA · <n>` con icono de
corona; y bloque `COMENTARIOS` con el input `Escribe un comentario...`.

`DAR CORONA · <n>` llama a `POST /lapidas/:id/corona` y refleja el contador devuelto.

### S7 — Pantalla Perfil de usuario

Cabecera: fondo `#8B4513`, `border: 3px solid #150800`, `radius 12px`, `padding: 20px`,
`gap: 20px`. Avatar circular `84x84` fondo `#DCF2E9`, `border: 3px solid #F5E0B8`, con
icono de persona; nombre `Press Start 2P 15px #E8C547`; subtítulo
`11px #F5E0B8`; botón `EDITAR PERFIL` (`Press Start 2P 9px`, estilo primario).

Estadísticas: fila `gap: 14px` con tarjetas `#F5E0B8` (`border: 2px solid #8B4513`,
`radius 8px`, `padding: 14px`): `Plantas asesinadas` (número `20px/700 #C0392B`),
`Coronas recibidas` (número `20px/700 #8B4513`) y tarjeta ancha de insignia con icono
`#2E7D5B` y el texto `Superviviente Zombie` + `una lápida "resucitó"`.

Sección `SU CEMENTERIO` (`Press Start 2P 11px #2E1305`) con grilla `repeat(4, 1fr)`,
`gap: 14px`, de tarjetas iguales a las del Inicio pero con imagen de `height: 70px` y pie
`<n> coronas` (`10px #8B4513`). Última celda: tarjeta punteada `+ Nueva lápida`.

### S8 — Pantalla Categorías (CRUD)

Fila de dos columnas: lista `flex: 1.7` y formulario `flex: 1`.

Cabecera de la lista: panel oscuro con `CATEGORÍAS` (`Press Start 2P 13px #E8C547`) y
badge `SOLO ADMIN` (`Press Start 2P 8px #F5E0B8`).

Lista: tarjeta `#F5E0B8`, `border: 3px solid #8B4513`, `radius 12px`, `padding: 20px`,
`gap: 10px`. Cada fila: fondo `#ffffff`, `border: 2px solid #8B4513`, `radius 8px`,
`padding: 12px 14px`, con nombre `13px/700`, conteo `<n> lápidas` (`11px #4A4A4A`),
botón `EDITAR` (`Press Start 2P 8px`, primario, `padding 8px 10px`) y botón `ELIMINAR`
(`Press Start 2P 8px`, destructivo). Singular/plural correcto: `1 lápida` / `N lápidas`.

Formulario: tarjeta `#F5E0B8`, `border: 3px solid #8B4513`, `radius 12px`, `padding: 24px`,
título `NUEVA CATEGORÍA` (`Press Start 2P 13px #2E1305`), label `Nombre`, input con
placeholder `Ej. Helechos`, ayuda `Máximo 20 caracteres` (`10px #4A4A4A`), botón
`GUARDAR CATEGORÍA` (primario).

`EDITAR` reemplaza el formulario por modo edición con el nombre actual y botón
`GUARDAR CAMBIOS`; `ELIMINAR` pide confirmación antes de llamar a la API.

### S9 — Pantallas de autenticación (4)

Todas comparten: nav reducida (solo logo `R.I.PLANTA`), tarjeta centrada `width: 460px`,
fondo `#F5E0B8`, `border: 3px solid #8B4513`, `radius 12px`, `padding: 32px`, `gap: 16px`,
con marca superior `CEMENTERIO DE PLANTAS` (`Press Start 2P 9px #8B4513`), título
(`Press Start 2P 14px #2E1305`), subtítulo (`12px #4A4A4A`) y botón primario
(`Press Start 2P 11px`).

1. **Iniciar sesión** — título `Vuelve a tu jardín`, subtítulo
   `Inicia sesión para cuidar tus recuerdos.`, campos `CORREO ELECTRÓNICO` y `CONTRASEÑA`
   con enlace `MOSTRAR`, botón `ENTRAR`, `¿OLVIDASTE TU CONTRASEÑA?` (`#C0392B 700`) y
   `¿AÚN NO TIENES CUENTA? CREAR UNA CUENTA`.
2. **Crear cuenta** — título `Únete al jardín`, subtítulo
   `Abre un espacio para tus homenajes.`, campos `NOMBRE DE USUARIO` (placeholder
   `@tu_usuario`), `CORREO ELECTRÓNICO`, `CONTRASEÑA` con `MOSTRAR`, `CONFIRMAR CONTRASEÑA`,
   botón `CREAR CUENTA` y `YA TENGO UNA CUENTA · INICIAR SESIÓN`.
3. **Recuperar contraseña** — título `Recupera tu acceso`, subtítulo
   `Te ayudaremos a volver a tu jardín.`, campo `CORREO ELECTRÓNICO`, botón `ENVIAR ENLACE`
   y `VOLVER A INICIAR SESIÓN`.
4. **Nueva contraseña** — título `Elige una nueva contraseña`, subtítulo
   `Tu jardín te estaba esperando.`, campos `NUEVA CONTRASEÑA` con `MOSTRAR` y
   `CONFIRMAR CONTRASEÑA`, botón `GUARDAR CONTRASEÑA` y `VOLVER A INICIAR SESIÓN`.

`MOSTRAR` alterna el tipo del input entre `password` y `text`.

Login real: `POST /sesiones` con `{ username, password }`, `credentials: 'include'`.
El prototipo rotula el campo `CORREO ELECTRÓNICO`, pero la API autentica por `username`;
la etiqueta visible es la del prototipo y el valor enviado es `username`. Se registra en el Log.

### S10 — Brecha prototipo↔backend: UI real con lo faltante deshabilitado

Regla: **nunca** inventar datos ni simular guardado. Cada capacidad sin endpoint queda
como UI fiel al prototipo, deshabilitada y con un aviso claro.

| Capacidad del prototipo | Sin soporte | Comportamiento |
|---|---|---|
| Crear cuenta | no hay endpoint | campos editables, botón deshabilitado + aviso |
| Recuperar contraseña | no hay endpoint | idem |
| Nueva contraseña | no hay endpoint | idem |
| Comentarios | no hay endpoint | lista y input deshabilitados + aviso |
| Subir foto | solo `fotoUrl` | zona deshabilitada + aviso; la lápida se crea sin foto |
| Asesinos seriales | sin `plantasAsesinadas` | lista vacía con nota de "disponible cuando la API exponga el contador" |
| Insignia Zombie / Editar perfil | sin endpoint | tarjeta informativa / botón deshabilitado |

Los avisos usan un componente compartido de estado, en la línea del
`Estados: formulario inicial, validación...` del README.

### S11 — Arquitectura scream y sesión

Estructura por capacidad de negocio, sin capas genéricas:

```
frontend/src/
  app/                 composición, navegación y layout
  features/
    lapidas/           model/ api/ ui/
    categorias/        model/ api/ ui/
    sesiones/          model/ api/ ui/
  shared/
    api/               cliente HTTP común
    ui/                componentes de diseño reutilizables
    styles/            tokens y estilos globales
```

Reglas: las claves JSON y los identificadores de dominio van en español (`lapida`,
`categoria`, `corona`); las funciones y estructuras en inglés; la copia de pantalla la
escribe React en español (regla 2 del README). `App.tsx` solo compone features y navega.

Sesión: `GET /sesiones/actual` al montar para resolver `{ id, username, rol }`.
Categorías mutan solo con rol `admin`; sin sesión o con rol `usuario`, la pantalla muestra
la UI en modo lectura con el aviso correspondiente. `DELETE /sesiones` para cerrar sesión.

Cliente HTTP: `credentials: 'include'`, base `VITE_API_URL` (por defecto
`http://localhost:3000`), y errores tipados por código de estado para que la UI decida la
copia (`401`, `403`, `429`, `400`, `404`, red).

## Tasks

| ID | Tarea | Specs | Ruta | Estado | Commit/Evidencia |
|---|---|---|---|---|---|
| T1 | Tokens, estilos globales, fuentes y layout base | S1, S2, S11 | inline | ✅ | `shared/styles/tokens.css`, `index.css`, `shared/styles/componentes.css` |
| T2 | Cliente HTTP tipado + componentes compartidos (botón, input, panel, aviso) | S1, S10, S11 | inline | ✅ | `shared/api/client.ts`, `shared/ui/{Aviso,Boton,Campo,Nav,iconos}.tsx` |
| T3 | Feature `lapidas`: modelo, api (find/create/corona/findAll) | S11 | inline | ✅ | `features/lapidas/{model,api}` |
| T4 | Feature `categorias`: modelo, api (findAll/create/update/remove) | S8, S11 | inline | ✅ | `features/categorias/{model,api}` |
| T5 | Feature `sesiones`: modelo, api (actual/iniciar/cerrar) | S9, S11 | inline | ✅ | `features/sesiones/{model,api}` |
| T6 | Pantalla Inicio (cementerio + sidebar) | S3 | inline | ✅ | `features/lapidas/ui/{InicioPage,GraveCard}.tsx` |
| T7 | Pantalla Ranking | S4 | inline | ✅ | `features/lapidas/ui/RankingPage.tsx` |
| T8 | Pantalla Publicar (con causa de muerte) | S5, S10 | inline | ✅ | `features/lapidas/ui/PublicarPage.tsx` |
| T9 | Pantalla Detalle + Dar corona | S6, S10 | inline | ✅ | `features/lapidas/ui/DetallePage.tsx` |
| T10 | Pantalla Perfil | S7, S10 | inline | ✅ | `features/lapidas/ui/PerfilPage.tsx` |
| T11 | Pantalla Categorías CRUD (admin) | S8, S10 | inline | ✅ | `features/categorias/ui/CategoriasPage.tsx` |
| T12 | Pantallas de autenticación (4) + sesión real | S9, S10, S11 | inline | ✅ | `features/sesiones/ui/*` |
| T13 | Composición en App + navegación + responsive | S2, S11 | inline | ✅ | `app/App.tsx` |
| T14 | Verificación: build, lint, y prueba manual contra la API real | todas | inline | ✅ | ver E5-E7 en el Log |

## Log

- **L1 (2026-10-19, solicitud original del usuario, verbatim):**
  > Bueno, en este proyecto ya quedo el backend, ahora falta el frontend, que debe ser en react + vite usando scream architecture, y tomando en cuenta el prototipo creado en riplanta.op, es en open pencil en windows y deberias acceder a el por mcp, sin embargo cambio su configuracion a esta{
  >   "type": "http",
  >   "url": "http://127.0.0.1:49457/mcp"
  > } , entonces, antes de revisar e implementar el front end revisa si es util el mcp para que el frontend quede como el prototipo, si no, revisa que el frontend concuerde con el prototipo y la documentacion

- **L2 (2026-10-19, corrección del usuario, verbatim):**
  > Perdon por interrumpirte, pero necesitaba actualizar el html del prototipo

- **L3 (2026-10-19, aclaración del usuario, verbatim):**
  > 1 Ambos son buenos, sin embargo el html es el exportado del original y el .op una adaptacion a otra herramienta 2 se añadieron pantallas nuevas, 3 ignora los respaldos

- **L4 (2026-10-19, corrección de jerarquía de fuentes, verbatim):**
  > Si, vuelve a leer el html, es de hecho, el mas importante, porque el .op no incluye todas las opciones del original

- **L5 (2026-10-19, decisión de alcance del usuario, verbatim de la opción elegida):**
  > Todo el prototipo, con lo faltante deshabilitado

- **L6 (2026-10-19, autorización para arrancar, verbatim):**
  > Hazlo

- **E1 (2026-10-19, exploración):** MCP de OpenPencil verificado vivo en
  `http://127.0.0.1:49457/mcp` (`openpencil-mcp 0.8.4`, ~150 tools). El modelo activo no
  acepta imágenes, así que la lectura exacta del diseño se hizo desempaquetando el HTML
  (doble bundler gzip+base64) y parseando `riplanta.op` como JSON plano.

- **E2 (2026-10-19, exploración):** El HTML actualizado trae 10 boards. Las 5 originales
  son idénticas a la versión previa; lo añadido son Categorías (CRUD) y las 4 de auth.
  El HTML es más rico que el `.op` en: conteo de lápidas por categoría, badge `SOLO ADMIN`,
  texto completo de la insignia Zombie, comentarios de ejemplo y zona de foto.

- **E3 (2026-10-19, brechas detectadas):** Sin endpoint: registro, recuperación de
  contraseña, comentarios, subida de fotos. `Usuario` solo expone `id/username/rol`
  (no hay `plantasAsesinadas` → Asesinos seriales sin datos). `CreateLapidaDto` exige
  `causaMuerte`, que el prototipo de Publicar no pide → T8 añade ese campo.

- **E4 (2026-10-19, estado de git):** `frontend/src/App.tsx` figura borrado en el working
  tree y `frontend/src/{app,features,shared}/` están sin trackear: el scaffold nunca se
  commiteó. Es un scaffold con otro diseño (no retro) que no se reutiliza; su lógica de
  composición sirve solo como referencia de contratos de API.

- **L7 (2026-10-19, conflicto de git detectado):** el archivo
  `R.I.Planta - Diseño retro.html` (1.48 MB) sigue **modificado y sin commitear**, y
  `riplanta.op` también. Son la fuente de verdad del diseño: hay que commitearlos (o al
  menos no perderlos) junto con el trabajo del frontend.

- **E5 (2026-10-19, verificación del contrato real):** los tipos del frontend coinciden
  campo por campo con el backend: `LapidaDocumentModel` (`nombrePlanta`, `epitafio`,
  `fechaFallecimiento`, `fechaPublicacion`, `autor`, `categoriaId`, `causaMuerte`,
  `fotoUrl`, `coronasCount`), `CategoriaDocumentModel` (`id`, `nombre`) y la respuesta
  de sesión (`{ id, username, rol, expiraEn }`). `UsuarioDocumentModel` **no** tiene
  `plantasAsesinadas`, lo que confirma el aviso de S10 para "Asesinos seriales".

- **E6 (2026-10-19, verificación end-to-end contra la API real):** backend levantado en
  `:3000` sobre Mongo `:27018`. Resultados observados:
  - `GET /categorias` → 200, `[{id:1,"Descuido"},{id:2,"Exceso de cariño"}]`
  - `GET /lapidas` → 200, 2 lápidas con todas las claves del tipo `Grave`
  - `POST /lapidas` con el payload exacto del form → **201** (antes daba 400 sin
    `causaMuerte`: la desviación de S5 es necesaria y verificada)
  - `POST /lapidas/2/corona` → 201, `coronasCount` 8 → 9
  - `POST /sesiones` con `{username,password}` → 201, cuerpo `{id,username,rol,expiraEn}`
  - `GET /sesiones/actual` con cookie → 200; sin sesión → 401
  - `POST /categorias` con sesión admin → 201; sin sesión → **401** (no 403: la UI ya
    bloquea por `rol`, así que ambos códigos se muestran bien)
  - `PUT`/`DELETE /categorias/:id` → 200; `DELETE /sesiones` → 204; luego 401
  - Los datos de prueba se revirtieron: cementerio y categorías volvieron a su estado
    inicial.

- **E7 (2026-10-19, verificación de render):** `pnpm build` (tsc -b && vite build) y
  `pnpm lint` (oxlint) pasan. Renderizado SSR de las 10 pantallas con `react-dom/server`
  y un loader de Vite, alimentado con la API real: **10/10** pantallas contienen la copia
  exacta del prototipo (títulos, subtítulos, labels, placeholders y botones) y el aviso
  "No disponible todavía" donde corresponde. El harness era desechable y se eliminó.

- **W1 (2026-10-19, work unit commit):** `cae6e4d` —
  `feat(frontend): implementar las 10 pantallas del prototipo retro`, 34 archivos,
  2577 inserciones / 228 borrados. Riesgo declarado: item 3 (el payload de Publicar
  fija el contrato compartido con el backend al incluir `causaMuerte`, que
  `CreateLapidaDto` exige). El scaffold viejo (`src/App.tsx`, `src/App.css`, assets del
  template de Vite) se eliminó en el mismo commit porque no correspondía al prototipo.

- **P1 (2026-10-19, pendiente de decisión del usuario):** entrega. Se acumularon
  ~2577 líneas autoradas, muy por encima del umbral de ~400, así que aplica la
  estrategia de entrega. Las opciones son: `single-pr` (un solo PR con este commit),
  `stacked-to-main` o `feature-branch-chain` (encadenado por slices). También queda
  sin commitear `R.I.Planta - Diseño retro.html` y `riplanta.op`, que son la fuente de
  verdad del diseño y no deberían perderse.

- **R1 (2026-10-19, review bloqueante — consentimiento otorgado):** el usuario eligió
  **"Review this change"** (`granted`). Al ejecutar el START:
  `lens_context_budget_exceeded` — la evidencia completa del candidato excede el budget
  nativo. El stop confirma que **no se creó autoridad**, así que no hay nada que
  abandonar ni reparar. Remedio indicado por el propio stop: partir el candidato en una
  secuencia encadenada de commits más chicos.

- **R2 (2026-10-19, cadena de slices):** se rehízo la historia en 7 commits, cada uno
  con su conteo de líneas autoradas:
  | Commit | Slice | +/− |
  |---|---|---|
  | `25ee66e` | tokens, iconos, primitivas, cliente HTTP | +465 / −25 |
  | `030a5dd` | hoja de estilos del prototipo | +888 / −255 |
  | `8a12607` | feature lápidas y sus 5 pantallas | +566 / −8 |
  | `177be80` | categorías CRUD y las 4 de auth | +453 / −177 |
  | `b015cde` | composición de la app y sesión | +205 / −1 |
  | `d88d7d1` | retiro de assets del template | +0 / −2 |
  | `4b7843b` | documento ODD | +358 / −4 |

  `pnpm build` y `pnpm lint` pasan sobre el árbol final. El árbol de trabajo quedó
  intacto (`App.tsx` del scaffold, assets y CSS se retiraron en los slices
  correspondientes).

- **R3 (2026-10-19, límite de la herramienta detectado):** `gentle-ai review assess`
  **no acota el candidato al `--base-ref` que se le pasa**: con `--base-ref 030a5dd`
  reporta 24 paths / 1585 líneas, cuando el diff real entre `030a5dd` y el commit
  siguiente es de **8 paths**. Los valores que sí respeta son los que puede canonicalizar
  como branch point (`b015cde~1` → 6 paths / 566 líneas, `medium/under_budget`;
  `4b7843b~1` → 1 path / 358 líneas, `passive`). Para reanudar la review hay que
  decidir qué slice se somete y con qué base canónica, o pedirle al usuario la
  estrategia de entrega (P1) para saber cuál es la primera slice a revisar.
