/**
 * Aviso de estado compartido.
 *
 * Usa el componente para mostrar estados explícitos de la UI: carga, error de
 * API, o una capacidad del prototipo que el backend todavía no soporta.
 */

type Props = {
  tono?: 'info' | 'error' | 'pendiente'
  titulo?: string
  children: React.ReactNode
}

export function Aviso({ tono = 'info', titulo, children }: Props) {
  return (
    <p className={`aviso aviso--${tono}`} role={tono === 'error' ? 'alert' : 'status'}>
      {titulo && <strong className="aviso__titulo">{titulo}</strong>}
      {children}
    </p>
  )
}

/**
 * Capacidad que el prototipo muestra pero el backend todavía no soporta.
 * Nunca simula guardado: deja claro que no está disponible.
 */
export function AvisoNoDisponible({ children }: { children: React.ReactNode }) {
  return (
    <Aviso tono="pendiente" titulo="No disponible todavía.">
      {children}
    </Aviso>
  )
}
