import { useState } from 'react'
import type { FormEvent } from 'react'
import { Aviso, AvisoNoDisponible } from '../../../shared/ui/Aviso'
import { Boton } from '../../../shared/ui/Boton'
import { CampoArea, CampoSelect, CampoTexto } from '../../../shared/ui/Campo'
import { IconoMas } from '../../../shared/ui/iconos'
import type { Category } from '../../categorias/model/categoria'
import type { CreateGraveInput } from '../model/lapida'

type Props = {
  categorias: Category[]
  onPublicar: (input: CreateGraveInput) => Promise<void>
}

export function PublicarPage({ categorias, onPublicar }: Props) {
  const [nombrePlanta, setNombrePlanta] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [fechaFallecimiento, setFechaFallecimiento] = useState('')
  const [causaMuerte, setCausaMuerte] = useState('')
  const [epitafio, setEpitafio] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await onPublicar({
        nombrePlanta,
        epitafio,
        fechaFallecimiento,
        categoriaId: Number(categoriaId),
        causaMuerte,
      })
    } catch {
      setError('No se pudo publicar la lápida. Revisá los datos e intentalo de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="publicar">
      <form className="publicar__tarjeta" onSubmit={manejarEnvio}>
        <h1 className="publicar__titulo">NUEVA LÁPIDA</h1>

        <div className="publicar__foto publicar__foto--deshabilitada">
          <IconoMas />
          <span>Arrastra una imagen o toca para subir</span>
        </div>
        <AvisoNoDisponible>
          La subida de fotos todavía no tiene endpoint. La lápida se publica sin imagen.
        </AvisoNoDisponible>

        <CampoTexto
          id="nombre"
          etiqueta="Nombre de la planta"
          placeholder="Ej. Pepino"
          maxLength={40}
          required
          value={nombrePlanta}
          onChange={(e) => setNombrePlanta(e.target.value)}
        />

        <div className="fila">
          <CampoSelect
            id="categoria"
            etiqueta="Categoría"
            required
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
          >
            <option value="" disabled>
              Elegí una categoría
            </option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </option>
            ))}
          </CampoSelect>

          <CampoTexto
            id="fecha"
            etiqueta="Fecha de fallecimiento"
            type="date"
            required
            value={fechaFallecimiento}
            onChange={(e) => setFechaFallecimiento(e.target.value)}
          />
        </div>

        <CampoTexto
          id="causa"
          etiqueta="Causa de muerte"
          placeholder="Ej. exceso de agua"
          maxLength={80}
          required
          value={causaMuerte}
          onChange={(e) => setCausaMuerte(e.target.value)}
          ayuda="El prototipo no pedía este campo, pero la API lo exige para publicar."
        />

        <CampoArea
          id="epitafio"
          etiqueta="Epitafio"
          placeholder="Escribe unas palabras de despedida..."
          rows={4}
          maxLength={280}
          required
          value={epitafio}
          onChange={(e) => setEpitafio(e.target.value)}
        />

        {error && <Aviso tono="error">{error}</Aviso>}

        <Boton type="submit" disabled={enviando || categorias.length === 0}>
          {enviando ? 'PUBLICANDO…' : 'PUBLICAR LÁPIDA'}
        </Boton>
      </form>
    </div>
  )
}
