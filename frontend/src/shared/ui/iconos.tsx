/**
 * Iconos del prototipo. Los trazos y tamaños por defecto salen del HTML de
 * referencia; el consumidor ajusta `size` cuando el prototipo usa otro valor.
 */

type IconoProps = {
  size?: number
  stroke?: string
  strokeWidth?: number
}

/** Hoja de planta: es el glifo de la "foto" placeholder de cada lápida. */
export function IconoHoja({ size = 34, stroke = '#2E1305', strokeWidth = 1.6 }: IconoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      aria-hidden="true"
    >
      <path d="M12 21c0-6 3-10 8-11-1 6-4 10-8 11Z" />
      <path d="M12 21c0-7-3-12-9-13 1 7 4 12 9 13Z" />
    </svg>
  )
}

/** Corona (la ofrenda floral fúnebre): el voto de la lápida. */
export function IconoCorona({ size = 12, stroke = '#C9924F', strokeWidth = 2 }: IconoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      aria-hidden="true"
    >
      <path d="M3 8l4 3 5-7 5 7 4-3-2 10H5L3 8Z" />
    </svg>
  )
}

/** Calavera: contador de "Asesinos seriales". */
export function IconoCalavera({ size = 11, stroke = '#C0392B', strokeWidth = 2 }: IconoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      aria-hidden="true"
    >
      <circle cx="12" cy="10" r="7" />
      <path d="M9 21v-4M15 21v-4M9 10h.01M15 10h.01" />
    </svg>
  )
}

/** Persona: avatar por defecto del perfil. */
export function IconoPersona({ size = 40, stroke = '#2E1305', strokeWidth = 1.6 }: IconoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  )
}

/** Insignia "Superviviente Zombie". */
export function IconoInsignia({ size = 20, stroke = '#2E7D5B', strokeWidth = 1.8 }: IconoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      aria-hidden="true"
    >
      <circle cx="12" cy="10" r="6" />
      <path d="M8 22l4-4 4 4" />
    </svg>
  )
}

/** Cruz simple de la zona de subida de foto. */
export function IconoMas({ size = 24, stroke = '#8B4513', strokeWidth = 2 }: IconoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
