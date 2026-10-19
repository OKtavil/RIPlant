import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

type BaseProps = {
  etiqueta: string
  ayuda?: ReactNode
  accion?: ReactNode
}

function Envoltorio({ etiqueta, ayuda, accion, children }: BaseProps & { children: ReactNode }) {
  return (
    <label className="campo">
      <span className="campo__etiqueta">{etiqueta}</span>
      {children}
      {accion && <span className="campo__accion">{accion}</span>}
      {ayuda && <span className="campo__ayuda">{ayuda}</span>}
    </label>
  )
}

type InputProps = BaseProps & InputHTMLAttributes<HTMLInputElement> & { id: string }

export function CampoTexto({ id, etiqueta, ayuda, accion, ...rest }: InputProps) {
  return (
    <Envoltorio etiqueta={etiqueta} ayuda={ayuda} accion={accion}>
      <input id={id} {...rest} />
    </Envoltorio>
  )
}

type TextareaProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string }

export function CampoArea({ id, etiqueta, ayuda, accion, ...rest }: TextareaProps) {
  return (
    <Envoltorio etiqueta={etiqueta} ayuda={ayuda} accion={accion}>
      <textarea id={id} {...rest} />
    </Envoltorio>
  )
}

type SelectProps = BaseProps & SelectHTMLAttributes<HTMLSelectElement> & { id: string }

export function CampoSelect({ id, etiqueta, ayuda, accion, children, ...rest }: SelectProps) {
  return (
    <Envoltorio etiqueta={etiqueta} ayuda={ayuda} accion={accion}>
      <select id={id} {...rest}>
        {children}
      </select>
    </Envoltorio>
  )
}
