# Rediseño del detalle de lápida y de la tarjeta

Objetivo: en la página propia de cada lápida, toda la información queda a la izquierda y
solo los comentarios a la derecha; la tarjeta de la grilla pasa a mostrar el epitafio.
Rama `copilot/working-copy`. Entrega: `ask-on-risk`. Runner: `pnpm --filter frontend run test`.

## Specs

- **S1** — En `DetallePage`, la columna izquierda muestra **foto, epitafio, nombre, autor,
  categoría, causa, fecha, `DAR CORONA` y `BORRAR ESTA LÁPIDA`** (el botón de borrar solo
  cuando `puedeBorrar()` lo permite). La columna derecha muestra **solo** `COMENTARIOS`.
  Petición textual del usuario: "necesito que los detalles esten todos a la izquierda y
  dejar solo los comentarios a la derecha".
- **S2** — La tarjeta de la grilla (`GraveCard`, variante `alta`) muestra el **epitafio**
  además de lo que ya muestra (foto, nombre, categoría · causa, autor, coronas). Aplica
  en **Inicio, Ranking y Perfil**. Petición textual: "en inicio, necesito que la card
  tambien muestre el epitafio" + decisión del usuario de extenderlo a las tres pantallas.
- **S3** — El cambio se refleja en **ambos prototipos**: `riplanta.op` y el HTML
  empaquetado (`R.I.Planta - Diseño retro.html`), en las dos representaciones.
- **S4** — La documentación refleja el nuevo layout: `docs/spec.md` y `docs/README.md`
  donde describan la tarjeta y el detalle.
- **S5** — Nada de la variante `baja` del perfil (imagen de 70px) cambia. El botón de
  borrar en la tarjeta (`lapida__borrar`) se mantiene como está.
- **S6** — Los 74 tests existentes siguen verdes; se agregan los que fijen el nuevo
  contrato (epitafio en la tarjeta; comentarios solos a la derecha).

Supuestos:
- "Detalles" incluye el botón de borrar — confirmado por el usuario.
- El epitafio en la tarjeta es el texto completo, sin truncar por CSS, consistente con
  el resto de la tarjeta.
- **Ranking no usa `GraveCard`**: renderiza filas `ranking__fila` propias. El usuario
  confirmó agregar el epitafio también ahí.

## Tasks

| ID | S# | Ruta | Estado | Commit |
|----|-----|------|--------|--------|
| T1 | S1 | inline | hecho | — |
| T2 | S2, S5 | inline | hecho | — |
| T3 | S6 | inline | hecho | — |
| T4 | S3 | inline | hecho | — |
| T5 | S4 | inline | hecho | — |

## Log

- **L15 (2026-10-20)** — Petición del usuario (verbatim): *"Necesito crear un cambio enorme
  en la vista de la lapida, no lo habia considerado, pero nececito que TODA la informacion
  de la lapida este junta, en este caso quiere decir que no solo el epitafio tine que estar
  en la card de la lapida, tambien el nombre, autor, causa, categoria fecha e incluso el
  boton de corona, este es un cambio grande que tambien necesito cambiar en la
  documentacion y modificar ambos prototipos"*.
  Aclaraciones del usuario tras dos preguntas: la pantalla es **la página propia de cada
  lápida**, y quiere **"los detalles todos a la izquierda y solo los comentarios a la
  derecha"**; además **la card de Inicio** debe mostrar el epitafio. El alcance del
  epitafio se extendió a **Inicio, Ranking y Perfil**. `BORRAR ESTA LÁPIDA` va a la
  izquierda con el resto.
  Nota: el usuario pidió repetir una pregunta dos veces ("otra vez la pregunta"), así que
  las respuestas a re-preguntar son las válidas.
  Estado real verificado antes de tocar código: `DetallePage` ya mostraba nombre, autor,
  categoría, causa, fecha y corona, pero repartidos en dos columnas (izq: foto+epitafio;
  der: el resto + comentarios). Lo que cambia es el reparto, no el contenido.
- **L16 (2026-10-20)** — Hallazgo antes de escribir código: **`RankingPage` no usa
  `GraveCard`**, renderiza filas `ranking__fila` propias. Se preguntó al usuario y eligió
  "Epitafio en Inicio, Perfil y también en la fila de Ranking". Además se encontró el
  **bug de identidad** en `ranking__fila`: usaba `@{lapida.autor}` (texto libre, "Anónimo")
  en vez de `nombreDelDuenio()`. Se corrigió en el mismo cambio y se fijó con test.
- **L17 (2026-10-20)** — T1-T3 ejecutados test-first:
  - `DetallePage.test.tsx`: +4 tests (todo en `.detalle__info`, solo comentarios en
    `.detalle__comentarios`, foto en la izquierda). RED 2 fallos → GREEN 8/8.
  - `GraveCard.test.tsx` (nuevo): 3 tests (epitafio en variante alta y baja; autor = dueño).
  - `RankingPage.test.tsx` (nuevo): 2 tests (epitafio en la fila; autor = dueño).
    RED 4 fallos → GREEN 5/5.
  - Suite completa: **82/82 tests, build ✓, lint ✓** (eran 74 antes).
- **L18 (2026-10-20)** — T4 (prototipos). Ambos quedaron desincronizados en el mismo
  detalle, así que se aplicó el cambio a las dos representaciones:
  - `riplanta.op`: el detalle reusa el frame izquierdo `p162` (ahora `flex 1.6`, con los
    7 bloques: foto `p163`, epitafio `p165`, título `p167`, autor `p168`, datos `p169`,
    corona `p176`, borrar `p362`) y deja `p179` (comentarios) solo a la derecha. En Inicio
    se insertó el epitafio en las 5 tarjetas (nodos nuevos `p364`-`p368`), en las 3 filas
    del panel de ranking (`p373`-`p375`) y en las 4 filas de la página Ranking
    (`p369`-`p372`). Resultado: 10 páginas, 385 IDs únicos, JSON válido.
  - HTML empaquetado: se reempaquetó el board del detalle (`15d196a6`), el de Inicio
    (`2a89de2b`) y el de Ranking (`ce6607ed`). **`git diff --numstat` del HTML da 1/1
    línea** — el formato exacto del manifest (`'\n' + json compacto + '\n  '`) se respetó
    y las otras 7 entradas quedaron byte-idénticas (verificado comparando cada blob).
  - Trampa evitada: el content de unos boards viene doble-escapado (`\u002F`, `\"`) y el
    de otros no; `find` sobre el texto crudo no encuentra los nombres. Se buscó sobre el
    string escapado tal cual.
- **L19 (2026-10-20)** — T5 (documentación): `docs/spec.md` sumó dos viñetas al contrato
  del frontend (tarjeta con epitafio; detalle con todo a la izquierda y comentarios a la
  derecha). `docs/README.md` actualizó la fila "Recordar" de la tabla de verificación
  manual. `frontend/README.md` es boilerplate de Vite y no describía la UI, así que no se
  tocó.
- **L20 (2026-10-20)** — Verificación final contra el backend real: `GET /lapidas`
  devuelve 10 lápidas, todas con epitafio, así que la tarjeta tiene qué mostrar en datos
  reales. Dev server (`:5173`) y backend (`:3000`) responden 200.
  **No commiteado todavía**: el worktree es compartido y la otra sesión tiene
  `frontend/vite.config.ts` modificado (proxy de túnel para la demo), que NO es parte de
  este cambio y no se debe stagear.
- **L21 (2026-10-20)** — Pedido nuevo del usuario (verbatim): "Una cosa mas de la pagina
  por lapida, todos los detalles deberian de ir en una sola card, primero titulo, luego
  epitafio". Al preguntar el orden completo respondió (verbatim): "Foto → título → autor
  → epitafio → datos".
  - **Código**: `DetallePage.tsx` reordenó el JSX (título y autor suben por encima del
    epitafio). `DetallePage.test.tsx` sumó un test de orden
    (`ordena los detalles: foto, título, autor, epitafio, datos`) — RED → GREEN 9/9.
  - **CSS**: para que sea realmente UNA card se quitaron las cajas internas. El epitafio
    perdió `background: var(--crema)` y `border-radius`; los datos perdieron
    `background`, `border` y `padding`. El panel de madera `.detalle__info` queda como
    única contenedora. `.detalle__autor` pasó de `var(--madera)` a `var(--texto-suave)`,
    que sobre el fondo madera se leía mal.
  - **Prototipos**: el board del detalle (`15d196a6`) se reescribió con el orden nuevo y
    sin las cajas internas; `git diff --numstat` del HTML da **1/1 línea** y las otras 9
    entradas quedaron intactas. El `.op` reordenó los hijos de `p162` a
    `p163 → p167 → p168 → p165 → p169 → p176 → p362`, recalculó las `y` locales
    (19 / 353 / 383 / 410 / 494.4 / 597.2 / 651.2) y `height` de `p162` a `710.2`
    (antes `705.2`); diff de **40/40 líneas**, JSON válido, 10 páginas.
  - **Suite**: **83/83 tests, build ✓, lint ✓**.
- **L22 (2026-10-20)** — Corrección del usuario sobre L21 (verbatim): "En esta card [la
  que agrupaba los detalles] era donde debían ir los detalles dentro del panel, menos la
  foto y los botones, luego corrige que los botones para que tengan el mismo tamaño".
  Yo había leído "una sola card" como *el panel entero* y borré la card interna. La
  lectura correcta: el panel es el contenedor, y **dentro** va una card con los detalles
  del texto, sin la foto ni los botones.
  - **Código**: `DetallePage.tsx` envuelve título, autor, epitafio y datos en
    `<div className="detalle__card">`. `DetallePage.test.tsx`: +3 tests (la card agrupa los
    4 bloques; la foto y las acciones quedan fuera; el orden dentro de la card). El test
    de orden viejo se reescribió a `foto → card → acciones` y se sumó el orden interno de
    la card. RED 4 fallos → GREEN **86/86** (eran 83).
  - **CSS**: `.detalle__card` recupera `background: var(--crema)`,
    `border: 2px solid var(--madera)`, `radius 8`, `padding 16` y el `gap` interno. Se
    quitó el `margin-top: 4px` del título, que era un parche de cuando estaba suelto.
  - **Botones del mismo tamaño**: `.detalle__corona` y `.detalle__borrar` eran dos reglas
    **duplicadas** (ambas `font-size: 10px; padding: 10px 16px`) y ninguna fijaba ancho,
    así que cada uno medía lo suyo según su texto. Se reemplazaron por una regla única
    `.detalle__acciones .boton` que además pisa el `border-width`/`radius` que
    `boton--chico` cambia (`VOLVER` usa `tamano="chico"`), y las acciones pasaron a
    `display: grid` con `repeat(auto-fit, minmax(190px, 1fr))` para que los tres
    compartan ancho. Se agregó `className="detalle__volver"` al botón de volver.
  - **Prototipos**: el board del detalle (`15d196a6`) ahora tiene la card con fondo crema
    (`#F5E0B8` + borde `#8B4513`) envolviendo título/autor/epitafio/datos, y los botones
    en un grid de 2 columnas iguales. Diff del HTML: **1/1 línea**, las otras 9 entradas
    byte-idénticas. En el `.op` se agregó el frame `p376` con el estilo de `p169`, que
    contiene `p167`, `p168`, `p165` y `p169` con coords relativas; los botones quedaron
    lado a lado (`p176` x=19 w=372, `p362` x=401 w=372, ambos y=629.2) y `height` de
    `p162` bajó de `710.2` a `688.2`. 386 IDs únicos, 10 páginas, JSON válido.
  - **Suite**: **86/86 tests, build ✓, lint ✓**.
- **L23 (2026-10-20)** — Pedido del usuario (verbatim): "El titulo en el nav bar tiene que
  tener un fondo transparente, que se vea la parte cafe de atras, el boton de iniciar
  sesion esta debajo de publicar, muevelo dentro del navbar". Al preguntar si había que
  llevarlo al prototipo (que no lo trae), respondió "Agregalo".
  - **Causa del fondo**: `.nav__logo` no declaraba `background`, pero es un `<button>` y
    heredaba el `buttonface` del user-agent. El prototipo lo dibuja como un `<div>` sin
    fondo. Se agregó `background: none; border: 0; padding: 0; cursor: pointer`.
  - **Causa de la posición**: las acciones vivían en `div.pantalla__acciones`, **fuera**
    del `<Nav>`, con `justify-content: flex-end` y
    `margin-top: calc(var(--gap-pantalla) * -1 + 6px)` — un parche que lo subía a pisar la
    fila del nav. Se eliminó esa clase y las acciones pasaron a `Nav` vía el prop
    `acciones`, dentro de `.nav__acciones`.
  - **Layout del nav**: pasó de `space-between` con 2 hijos a `flex-start` con 3, y
    `.nav__items` tomó `margin-left: auto` para que menú + acciones queden juntos a la
    derecha (con `space-between` el menú quedaba centrado).
  - **Tests**: `Nav.test.tsx` es nuevo (4 tests): logo sin fondo, acciones dentro del nav,
    nav sin acciones, y orden de hijos `logo, items, acciones`. RED 1 fallo → GREEN
    **90/90** (eran 86).
  - **Prototipos**: el `INICIAR SESIÓN` se agregó a los **6 boards con nav** (Inicio,
    Ranking, Publicar, Detalle, Perfil, Categorías). Los 4 de auth no lo llevan: 3 ya lo
    tienen como enlace al pie y el board de login no puede enlazarse a sí mismo. Se cambió
    `space-between` → `flex-start` + `margin-left: auto` en el grupo, igual que el código.
    Diff del HTML: **1/1 línea**; las otras 4 entradas byte-idénticas. En el `.op` se
    agregaron `p377`-`p382` (uno por nav) y se recalcularon las `x` del grupo de links.
  - **Bug evitado**: al recalcular las `x` en Categorías, el filtro por lista de contenidos
    no capturó `CATEGORIAS` (sin tilde en el `.op`) y quedó **solapado** encima de
    `INICIAR SESIÓN`. Se rehízo filtrando por "todo text que no sea el logo" y se verificó
    que ningún par de textos se solape.
  - **Suite**: **90/90 tests, build ✓, lint ✓**.

## Comentarios (S6) — leer y escribir

- **L24 (2026-10-20)** — Pedido del usuario (verbatim): "hora de continuar con el frontend" +
  "recuerda no pisar la otra sesion". Al preguntar cómo partíamos los comentarios, eligió
  **"Leer y escribir primero"**: el borrado admin queda para un segundo slice.
  - **Hallazgo**: `DetallePage` mostraba `AvisoNoDisponible` con el texto *"los comentarios
    todavía no tienen endpoint"*, y **eso era falso**: el backend ya tiene los tres
    endpoints. El aviso estaba desactualizado, no bloqueado.
  - **Trampa de la ruta**: el `DELETE` vive en `/comentarios/:id`, **no** bajo
    `/lapidas/:id` (`comentarios.controller.ts` no lleva prefijo justamente porque S6 pide
    rutas en dos colecciones). Un `DELETE /lapidas/:id/comentarios/:cid` daría `404`.
  - **Trampa del `id`**: en comentarios el `id` es **string** (el `_id` de Mongo), no el
    entero que usan `lapidas` y `categorias`. La razón está en `comentario.interface.ts`:
    un contador `max + 1` sería una carrera real, porque comenta cualquiera con sesión.
  - **Trampa del `autor`**: viene **sin `@`** (es el `username` pelado). El `@` lo pone la
    UI, igual que con `nombreDelDuenio()`.
  - **Feature nueva** (`features/comentarios/`, scream): `model/comentario.ts` (tipo,
    `LARGO_MAXIMO_TEXTO = 500`, `esTextoValido()`), `api/comentarios.api.ts`
    (`listar`/`crear`), `ui/ListaComentarios.tsx` + su test.
  - **Estado local, no en `App`**: los comentarios son de una sola pantalla; subirlos
    obligaría a pasar dos props más por todo el árbol sin ganar nada.
  - **`key={lapida.id}`** en el `ListaComentarios` de `DetallePage`: remonta al cambiar de
    lápida, para que no se arrastre el texto a medio escribir. Esto además sacó el
    `setState` sincrónico del effect, que oxlint marcaba como
    `react(set-state-in-effect)`.
  - **Verificación RED→GREEN**: `ListaComentarios.test.tsx` es nuevo (6 tests: lista con
    autor y texto, lista vacía, sin sesión invita a entrar, con sesión agrega el comentario,
    no envía vacío, recarga al cambiar de lápida). `comentarios.api.test.ts` (2 tests).
  - **Contaminación evitada**: `DetallePage` monta `ListaComentarios`, que sale a la red al
    montar. Los 12 tests de `DetallePage` pasaban **sin mockear `fetch`** y dependían de que
    hubiera un backend vivo en `localhost:3000`. Se agregó el mock global y una aserción de
    que la lista real está montada (`/lapidas/42/comentarios`).
  - **Convención respetada**: `@testing-library/user-event` **no está instalado**; se usó
    `fireEvent`, que es lo que ya usan `LoginPage.test.tsx` y el resto.
  - **Suite**: **99/99 tests, build ✓, lint ✓**.
