import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

type BaseProps = {
  etiqueta: string
  ayuda?: ReactNode
  accion?: ReactNode
  error?: string
}

function Envoltorio({ etiqueta, ayuda, accion, error, children }: BaseProps & { children: ReactNode }) {
  return (
    <label className={`campo${error ? ' campo--error' : ''}`}>
      <span className="campo__etiqueta">{etiqueta}</span>
      {children}
      {accion && <span className="campo__accion">{accion}</span>}
      {error && (
        <span className="campo__error" role="alert">
          {error}
        </span>
      )}
      {ayuda && !error && <span className="campo__ayuda">{ayuda}</span>}
    </label>
  )
}

type InputProps = BaseProps & InputHTMLAttributes<HTMLInputElement> & { id: string }

export function CampoTexto({ id, etiqueta, ayuda, accion, error, ...rest }: InputProps) {
  return (
    <Envoltorio etiqueta={etiqueta} ayuda={ayuda} accion={accion} error={error}>
      <input id={id} {...rest} aria-invalid={error ? true : undefined} />
    </Envoltorio>
  )
}

type TextareaProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string }

export function CampoArea({ id, etiqueta, ayuda, accion, error, ...rest }: TextareaProps) {
  return (
    <Envoltorio etiqueta={etiqueta} ayuda={ayuda} accion={accion} error={error}>
      <textarea id={id} {...rest} aria-invalid={error ? true : undefined} />
    </Envoltorio>
  )
}

type SelectProps = BaseProps & SelectHTMLAttributes<HTMLSelectElement> & { id: string }

export function CampoSelect({ id, etiqueta, ayuda, accion, error, children, ...rest }: SelectProps) {
  return (
    <Envoltorio etiqueta={etiqueta} ayuda={ayuda} accion={accion} error={error}>
      <select id={id} {...rest} aria-invalid={error ? true : undefined}>
        {children}
      </select>
    </Envoltorio>
  )
}
