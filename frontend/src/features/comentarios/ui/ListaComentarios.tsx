import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Aviso } from '../../../shared/ui/Aviso'
import { Boton } from '../../../shared/ui/Boton'
import { ApiError } from '../../../shared/api/client'
import type { Session } from '../../sesiones/model/sesion'
import { comentariosApi } from '../api/comentarios.api'
import { esTextoValido, LARGO_MAXIMO_TEXTO, type Comentario } from '../model/comentario'

type Props = {
  lapidaId: number
  sesion: Session | null
}

/**
 * Lista y alta de comentarios de una lápida (S6).
 *
 * El `GET` es público, así que la lista se carga aunque no haya sesión; lo que
 * exige sesión es escribir. Sin sesión el formulario se reemplaza por una
 * invitación a entrar en vez de un campo que rebotaría con `401`.
 *
 * El estado vive acá y no en `App` a propósito: los comentarios son de una sola
 * pantalla y no los consumen los otros componentes. Subirlos obligaría a pasar
 * dos props más por todo el árbol sin ganar nada.
 */
export function ListaComentarios({ lapidaId, sesion }: Props) {
  const [comentarios, setComentarios] = useState<Comentario[] | null>(null)
  const [texto, setTexto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Al cambiar de lápida se recarga todo. `cancelado` evita que una respuesta
  // lenta de la lápida anterior pise la lista de la nueva.
  useEffect(() => {
    let cancelado = false

    comentariosApi
      .listar(lapidaId)
      .then((items) => {
        if (!cancelado) setComentarios(items)
      })
      .catch((e: unknown) => {
        if (!cancelado) setError(mensajeDeError(e))
      })

    return () => {
      cancelado = true
    }
  }, [lapidaId])

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!esTextoValido(texto) || enviando) return

    setEnviando(true)
    setError(null)
    try {
      const creado = await comentariosApi.crear(lapidaId, texto.trim())
      setComentarios((items) => [...(items ?? []), creado])
      setTexto('')
    } catch (e: unknown) {
      setError(mensajeDeError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="detalle__comentarios">
      <h2 className="detalle__comentarios-titulo">COMENTARIOS</h2>

      {error && <Aviso tono="error">{error}</Aviso>}

      {comentarios === null && !error ? (
        <Aviso>Cargando los comentarios…</Aviso>
      ) : comentarios?.length === 0 ? (
        <p className="detalle__comentario">
          Todavía no hay comentarios. Sé el primero en dejar una flor.
        </p>
      ) : (
        comentarios?.map((c) => (
          <p key={c.id} className="detalle__comentario">
            <strong>@{c.autor}:</strong> {c.texto}
          </p>
        ))
      )}

      {sesion ? (
        <form className="detalle__comentario-form" onSubmit={(e) => void enviar(e)}>
          <input
            type="text"
            value={texto}
            maxLength={LARGO_MAXIMO_TEXTO}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe un comentario..."
            aria-label="Escribe un comentario"
          />
          <Boton tamano="chico" type="submit" disabled={!esTextoValido(texto) || enviando}>
            {enviando ? 'ENVIANDO…' : 'COMENTAR'}
          </Boton>
        </form>
      ) : (
        <Aviso>Iniciá sesión para comentar.</Aviso>
      )}
    </div>
  )
}

/** La copia del error sale del `ApiError` del cliente; el resto es genérico. */
function mensajeDeError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  return 'No se pudieron cargar los comentarios.'
}
