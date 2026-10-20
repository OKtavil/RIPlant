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
