import { useEffect } from 'react'
import { Boton } from './Boton'

/**
 * Confirmación modal para acciones que no se deshacen (E004).
 *
 * Reemplaza a `window.confirm` en el borrado de lápidas: el diálogo nativo
 * bloquea el hilo, no se puede estilar y en móvil algunos navegadores lo
 * suprimen. Usa `role="dialog"` y `aria-modal` para que el lector de pantalla
 * anuncie el contexto en vez de leer la pantalla de fondo.
 *
 * El foco arranca en CANCELAR, no en confirmar: la acción destructiva no debe
 * quedar a un Enter de distancia.
 */

type Props = {
  titulo: string
  children: React.ReactNode
  etiquetaConfirmar: string
  onConfirmar: () => void
  onCancelar: () => void
}

export function Confirmacion({
  titulo,
  children,
  etiquetaConfirmar,
  onConfirmar,
  onCancelar,
}: Props) {
  useEffect(() => {
    const alPresionar = (evento: KeyboardEvent) => {
      // Escape cierra sin ejecutar: es la salida que espera cualquiera que se
      // haya abierto el modal por error.
      if (evento.key === 'Escape') onCancelar()
    }
    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [onCancelar])

  return (
    <div className="modal" onClick={onCancelar}>
      <div
        className="modal__caja"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmacion-titulo"
        // El clic dentro de la caja no debe burbujear al fondo, o cerraría el
        // modal cuando la persona solo quiso seleccionar el texto.
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2 className="modal__titulo" id="confirmacion-titulo">
          {titulo}
        </h2>
        <p className="modal__texto">{children}</p>
        <div className="modal__acciones">
          <Boton tamano="chico" onClick={onCancelar} autoFocus>
            CANCELAR
          </Boton>
          <Boton variante="peligro" tamano="chico" onClick={onConfirmar}>
            {etiquetaConfirmar}
          </Boton>
        </div>
      </div>
    </div>
  )
}
