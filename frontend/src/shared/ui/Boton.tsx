import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'peligro'
  tamano?: 'normal' | 'chico'
  bloque?: boolean
  children: ReactNode
}

/**
 * Botón del prototipo: gradiente dorado (`--dorado-claro` → `--dorado`) con
 * borde `--inset-panel`, texto en `Press Start 2P`.
 */
export function Boton({
  variante = 'primario',
  tamano = 'normal',
  bloque = false,
  className = '',
  children,
  ...rest
}: Props) {
  const clases = [
    'boton',
    tamano === 'chico' && 'boton--chico',
    variante === 'peligro' && 'boton--peligro',
    bloque && 'boton--bloque',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={clases} {...rest}>
      {children}
    </button>
  )
}

type EnlaceBotonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tono?: 'madera' | 'rojo'
  children: ReactNode
}

/** Enlace de texto sin fondo, para los pies de las pantallas de autenticación. */
export function EnlaceBoton({ tono = 'madera', className = '', children, ...rest }: EnlaceBotonProps) {
  const clases = ['auth__enlace', tono === 'rojo' && 'auth__enlace--rojo', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={clases} {...rest}>
      {children}
    </button>
  )
}
