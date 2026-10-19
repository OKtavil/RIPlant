import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../../shared/api/client'
import { Aviso, AvisoNoDisponible } from '../../../shared/ui/Aviso'
import { Boton } from '../../../shared/ui/Boton'
import { CampoTexto } from '../../../shared/ui/Campo'
import { CATEGORIA_MAX, CATEGORIA_MIN, contarLapidas, type Category } from '../model/categoria'
import type { Session } from '../../sesiones/model/sesion'

type Props = {
  categorias: Category[]
  conteoLapidas: (categoriaId: number) => number
  sesion: Session | null
  onCrear: (nombre: string) => Promise<void>
  onActualizar: (id: number, nombre: string) => Promise<void>
  onEliminar: (id: number) => Promise<void>
}

export function CategoriasPage({
  categorias,
  conteoLapidas,
  sesion,
  onCrear,
  onActualizar,
  onEliminar,
}: Props) {
  const esAdmin = sesion?.rol === 'admin'
  const [editando, setEditando] = useState<Category | null>(null)
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const nombreValido = nombre.trim().length >= CATEGORIA_MIN && nombre.trim().length <= CATEGORIA_MAX

  function limpiarFormulario() {
    setEditando(null)
    setNombre('')
    setError('')
  }

  function empezarEdicion(categoria: Category) {
    setEditando(categoria)
    setNombre(categoria.nombre)
    setError('')
  }

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault()
    if (!nombreValido) return
    setEnviando(true)
    setError('')
    try {
      if (editando) {
        await onActualizar(editando.id, nombre.trim())
      } else {
        await onCrear(nombre.trim())
      }
      limpiarFormulario()
    } catch (fallo) {
      setError(fallo instanceof ApiError ? fallo.message : 'No se pudo guardar la categoría.')
    } finally {
      setEnviando(false)
    }
  }

  async function eliminar(categoria: Category) {
    if (!window.confirm(`¿Eliminar la categoría “${categoria.nombre}”?`)) return
    setError('')
    try {
      await onEliminar(categoria.id)
      if (editando?.id === categoria.id) limpiarFormulario()
    } catch (fallo) {
      setError(fallo instanceof ApiError ? fallo.message : 'No se pudo eliminar la categoría.')
    }
  }

  return (
    <div className="pantalla__contenido">
      <section className="feed">
        <div className="panel-oscuro">
          <h1 className="panel-oscuro__titulo">CATEGORÍAS</h1>
          <span className="panel-oscuro__badge">SOLO ADMIN</span>
        </div>

        <div className="lista">
          {!esAdmin && (
            <Aviso tono="pendiente">
              Necesitás una sesión con rol <strong>admin</strong> para crear, editar o eliminar
              categorías.
            </Aviso>
          )}

          {categorias.map((categoria) => (
            <div key={categoria.id} className="lista__fila">
              <span className="lista__nombre">{categoria.nombre}</span>
              <span className="lista__conteo">{contarLapidas(conteoLapidas(categoria.id))}</span>
              <Boton tamano="chico" disabled={!esAdmin} onClick={() => empezarEdicion(categoria)}>
                EDITAR
              </Boton>
              <Boton
                tamano="chico"
                variante="peligro"
                disabled={!esAdmin}
                onClick={() => void eliminar(categoria)}
              >
                ELIMINAR
              </Boton>
            </div>
          ))}

          {categorias.length === 0 && <p className="lista__conteo">Todavía no hay categorías.</p>}
        </div>
      </section>

      <section className="feed">
        <form className="tarjeta" onSubmit={manejarEnvio}>
          <h2 className="publicar__titulo">{editando ? 'EDITAR CATEGORÍA' : 'NUEVA CATEGORÍA'}</h2>

          <CampoTexto
            id="categoria-nombre"
            etiqueta="Nombre"
            placeholder="Ej. Helechos"
            maxLength={CATEGORIA_MAX}
            value={nombre}
            disabled={!esAdmin}
            onChange={(e) => setNombre(e.target.value)}
            ayuda="Máximo 20 caracteres"
          />

          {error && <Aviso tono="error">{error}</Aviso>}

          <div className="fila">
            <Boton type="submit" disabled={!esAdmin || !nombreValido || enviando}>
              {editando ? 'GUARDAR CAMBIOS' : 'GUARDAR CATEGORÍA'}
            </Boton>
            {editando && (
              <Boton type="button" tamano="chico" onClick={limpiarFormulario}>
                CANCELAR
              </Boton>
            )}
          </div>

          {!esAdmin && (
            <AvisoNoDisponible>
              Sin sesión admin, el formulario queda en modo lectura.
            </AvisoNoDisponible>
          )}
        </form>
      </section>
    </div>
  )
}
