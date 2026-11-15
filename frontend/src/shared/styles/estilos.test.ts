import { describe, expect, it } from 'vitest'
import componentes from './componentes.css?raw'
import tokens from './tokens.css?raw'

/**
 * Contrato de la hoja de estilos para J002 y J004.
 *
 * Los dos defectos son del CSS, no del marcado, y jsdom no los reproduce: para
 * un `<button>` devuelve el `text-align: center` del UA por encima de nuestras
 * reglas de autor (los navegadores reales hacen lo contrario), y no aplica el
 * `margin: 1em` del `<p>`. Por eso el test fija la declaración que corrige el
 * defecto, no un estilo computado que jsdom calcularía mal.
 */

/** Bloque de declaraciones del primer selector top-level exacto. */
function bloque(css: string, selector: string): string {
  const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const escapado = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const encontrado = new RegExp(`(?:^|\\})\\s*${escapado}\\s*\\{([^}]*)\\}`).exec(sinComentarios)
  expect(encontrado, `falta la regla ${selector}`).not.toBeNull()
  return encontrado![1]
}

describe('hoja de estilos', () => {
  it('no deja que el navegador centre las filas del ranking (J004)', () => {
    // El prototipo usa `<a>`/`<div>`, alineados a la izquierda. Las filas son
    // `<button>`: sin `text-align: left`, el navegador centra el texto y los
    // nombres largos quedan desalineados.
    expect(bloque(componentes, '.ranking__fila')).toMatch(/text-align\s*:\s*left/)
    expect(bloque(componentes, '.sidebar__fila')).toMatch(/text-align\s*:\s*left/)
  })

  it('no deja el margen del navegador en párrafos ni títulos (J002)', () => {
    // El diseño separa con `gap`; el `margin: 1em 0` del `<p>` se sumaba al
    // `gap` de cada contenedor flex y abría huecos que el prototipo no tiene.
    // Los títulos traen el mismo tipo de margen del navegador.
    expect(bloque(tokens, 'p')).toMatch(/(?:^|;)\s*margin\s*:\s*0/)
    expect(bloque(tokens, 'h1, h2, h3')).toMatch(/(?:^|;)\s*margin\s*:\s*0/)
  })

  it('da un fondo degradado al texto y una franja clara a las coronas de inicio', () => {
    const contenidoInicio = bloque(componentes, '.lapida--alta .lapida__contenido')
    expect(contenidoInicio).toMatch(/background\s*:\s*linear-gradient/)
    expect(contenidoInicio).toMatch(/flex-grow\s*:\s*1/)
    expect(bloque(componentes, 'button.lapida__coronas')).toMatch(
      /background\s*:\s*linear-gradient\([^;]*var\(--azul-claro\)[^;]*var\(--blanco\)/,
    )
  })

  it('marca con un borde dorado interior el botón cuando ya puso corona', () => {
    expect(bloque(componentes, '.lapida__coronas--puesta')).toMatch(
      /box-shadow\s*:\s*inset[^;]*var\(--amarillo\)/,
    )
    expect(bloque(componentes, '.detalle__corona--puesta')).toMatch(
      /box-shadow\s*:\s*inset[^;]*var\(--amarillo\)/,
    )
  })

  it('estira las tarjetas de Inicio al alto de la más alta de cada fila', () => {
    expect(bloque(componentes, '.grilla--tres')).toMatch(/align-items\s*:\s*stretch/)
  })

  it('aplica el tratamiento del texto y las coronas también a las lápidas del perfil', () => {
    expect(bloque(componentes, '.lapida--baja .lapida__contenido')).toMatch(
      /background\s*:\s*linear-gradient/,
    )
    expect(bloque(componentes, '.lapida--baja .lapida__coronas')).toMatch(
      /background\s*:\s*linear-gradient\([^;]*var\(--azul-claro\)[^;]*var\(--blanco\)/,
    )
  })

  it('ata el sidebar al alto de la pantalla y no al de la página', () => {
    // El sidebar vive junto al feed: sin `sticky` crecía hasta el fondo de la
    // página y se iba con el scroll. Tiene que quedar a la vista, con alto de
    // viewport y scroll propio.
    const sidebar = bloque(componentes, '.sidebar')
    expect(sidebar).toMatch(/position\s*:\s*sticky/)
    expect(sidebar).toMatch(/height\s*:\s*calc\(\s*100vh/)
    expect(sidebar).toMatch(/overflow-y\s*:\s*auto/)
  })

  it('mantiene el detalle en el viewport y desplaza de forma independiente su contenido largo', () => {
    const pantallaDetalle = bloque(componentes, '.pantalla--detalle')
    expect(pantallaDetalle).toMatch(/height\s*:\s*100dvh/)
    expect(pantallaDetalle).toMatch(/overflow\s*:\s*hidden/)

    const contenido = bloque(componentes, '.pantalla__contenido--detalle')
    expect(contenido).toMatch(/min-height\s*:\s*0/)
    expect(contenido).toMatch(/overflow\s*:\s*hidden/)

    const card = bloque(componentes, '.detalle__card')
    expect(card).toMatch(/flex\s*:\s*1/)
    expect(card).toMatch(/overflow-y\s*:\s*auto/)

    const listaComentarios = bloque(componentes, '.detalle__comentarios-lista')
    expect(listaComentarios).toMatch(/flex\s*:\s*1/)
    expect(listaComentarios).toMatch(/overflow-y\s*:\s*auto/)
  })

  it('reserva el alto del rótulo RESUCITADA y lo revela solo al revivir', () => {
    // El span existe siempre: si se quitara del DOM, la lápida cambiaría de
    // tamaño al resucitar. `visibility: hidden` conserva el espacio.
    expect(bloque(componentes, '.lapida__resucitada')).toMatch(/visibility\s*:\s*hidden/)
    expect(bloque(componentes, '.lapida--resucitada .lapida__resucitada')).toMatch(
      /visibility\s*:\s*visible/,
    )
  })

  it('pinta el rótulo RESUCITADA como texto propio, sin caja', () => {
    const rotulo = bloque(componentes, '.lapida__resucitada')
    expect(rotulo).toMatch(/color\s*:\s*var\(--madera\)/)
    expect(rotulo).toMatch(/font-family\s*:\s*var\(--fuente-pixel\)/)
    // Sin fondo ni borde: el rótulo no introduce otra caja en la tarjeta.
    expect(rotulo).not.toMatch(/(?:^|;)\s*background\s*:/)
    expect(rotulo).not.toMatch(/(?:^|;)\s*border\s*:/)
  })

  it('hace lo mismo con el rótulo del detalle de la lápida', () => {
    expect(bloque(componentes, '.detalle__resucitada')).toMatch(/visibility\s*:\s*hidden/)
    expect(bloque(componentes, '.detalle__card--resucitada .detalle__resucitada')).toMatch(
      /visibility\s*:\s*visible/,
    )

    const rotulo = bloque(componentes, '.detalle__resucitada')
    expect(rotulo).toMatch(/color\s*:\s*var\(--madera\)/)
    expect(rotulo).toMatch(/font-family\s*:\s*var\(--fuente-pixel\)/)
    expect(rotulo).not.toMatch(/(?:^|;)\s*background\s*:/)
    expect(rotulo).not.toMatch(/(?:^|;)\s*border\s*:/)
  })

  it('destaca el autor solo en la página de la lápida', () => {
    // En la ficha del detalle el autor es el dato que identifica al dueño; en
    // la tarjeta de la grilla sigue en peso normal para no competir con el
    // nombre.
    expect(bloque(componentes, '.detalle__autor')).toMatch(/font-weight\s*:\s*700/)
    expect(bloque(componentes, '.lapida__autor')).not.toMatch(/font-weight\s*:\s*700/)
  })
})
