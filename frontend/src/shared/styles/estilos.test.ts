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
    expect(bloque(componentes, '.lapida--alta .lapida__contenido')).toMatch(
      /background\s*:\s*linear-gradient/,
    )
    expect(bloque(componentes, 'button.lapida__coronas')).toMatch(
      /background\s*:\s*linear-gradient\([^;]*var\(--azul-claro\)[^;]*var\(--blanco\)/,
    )
  })

  it('aplica el tratamiento del texto y las coronas también a las lápidas del perfil', () => {
    expect(bloque(componentes, '.lapida--baja .lapida__contenido')).toMatch(
      /background\s*:\s*linear-gradient/,
    )
    expect(bloque(componentes, '.lapida--baja .lapida__coronas')).toMatch(
      /background\s*:\s*linear-gradient\([^;]*var\(--azul-claro\)[^;]*var\(--blanco\)/,
    )
  })
})
