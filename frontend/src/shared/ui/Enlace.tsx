import type { ComponentProps, MouseEvent } from 'react'

type Props = Omit<ComponentProps<'a'>, 'href'> & {
  /** Destino real de la barra de direcciones. */
  href: string
  /**
   * Navegación interna. Si falta, el link hace una navegación completa, que es
   * el comportamiento nativo.
   */
  onNavegar?: (destino: string) => void
}

/**
 * Link con URL real que navega por el router de la app.
 *
 * El `href` no es decorativo: mantiene abrir en otra pestaña, copiar el enlace
 * y el historial del navegador. El `onClick` solo intercepta el clic simple;
 * con modificadores (Ctrl/Cmd/Shift/Alt) o botón del medio se deja al
 * navegador para que haga lo que el usuario pidió.
 */
export function Enlace({ href, onNavegar, onClick, ...resto }: Props) {
  function manejarClic(evento: MouseEvent<HTMLAnchorElement>) {
    onClick?.(evento)
    if (!onNavegar || evento.defaultPrevented) return
    if (evento.button !== 0) return
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return

    evento.preventDefault()
    onNavegar(href)
  }

  return <a href={href} onClick={manejarClic} {...resto} />
}
