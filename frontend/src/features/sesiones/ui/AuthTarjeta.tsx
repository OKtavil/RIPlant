import type { ReactNode } from 'react'

/**
 * Tarjeta compartida por las 4 pantallas de autenticación.
 * El prototipo no muestra navegación en estas pantallas: solo el logo.
 */

type Props = {
  titulo: string
  subtitulo: string
  children: ReactNode
  pie?: ReactNode
}

export function AuthTarjeta({ titulo, subtitulo, children, pie }: Props) {
  return (
    <div className="auth">
      <section className="auth__tarjeta">
        <span className="auth__marca">CEMENTERIO DE PLANTAS</span>
        <hgroup>
          <h1 className="auth__titulo">{titulo}</h1>
          <p className="auth__subtitulo">{subtitulo}</p>
        </hgroup>
        {children}
        {pie && <footer className="auth__pie">{pie}</footer>}
      </section>
    </div>
  )
}

/** Botón `MOSTRAR` que alterna la visibilidad de un campo de contraseña. */
export function AlternarMostrar({ visible, onAlternar }: { visible: boolean; onAlternar: () => void }) {
  return (
    <button type="button" className="auth__enlace" onClick={onAlternar}>
      {visible ? 'OCULTAR' : 'MOSTRAR'}
    </button>
  )
}
