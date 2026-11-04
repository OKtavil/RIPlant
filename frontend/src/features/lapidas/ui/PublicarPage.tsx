import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../../shared/api/client'
import { Aviso } from '../../../shared/ui/Aviso'
import { Boton } from '../../../shared/ui/Boton'
import { CampoArea, CampoSelect, CampoTexto } from '../../../shared/ui/Campo'
import type { Category } from '../../categorias/model/categoria'
import type { CreateGraveInput } from '../model/lapida'

/** Mismo tope que aplica multer en el backend (`TAMANIO_MAXIMO_FOTO`). */
const TAMANIO_MAXIMO_FOTO = 5 * 1024 * 1024

/**
 * Cota inferior del rango razonable de fallecimiento (E001), espejo del
 * validador del backend. Antes de 1900 es un typo, no una lápida.
 */
const FECHA_MINIMA = '1900-01-01'

/**
 * `toISOString()` convierte a UTC, y en husos alejados de UTC eso mueve el día.
 * El input `date` y el usuario trabajan en hora local, así que la comparación
 * se hace con la fecha local.
 */
function fechaLocalISO(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

type Props = {
  categorias: Category[]
  /**
   * Publica la lápida. El segundo argumento es la foto elegida, si hay: el
   * padre la sube después de crear la lápida, porque el endpoint de la foto
   * cuelga del `id` que devuelve el `POST /lapidas`.
   */
  onPublicar: (input: CreateGraveInput, foto?: File) => Promise<void>
}

export function PublicarPage({ categorias, onPublicar }: Props) {
  const [nombrePlanta, setNombrePlanta] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [fechaFallecimiento, setFechaFallecimiento] = useState('')
  const [causaMuerte, setCausaMuerte] = useState('')
  const [epitafio, setEpitafio] = useState('')
  const [foto, setFoto] = useState<File | undefined>(undefined)
  const [enviando, setEnviando] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})
  // Se captura al montar: el formulario no vive más de un día, y así el render
  // no llama a `new Date()` (función impura) en cada re-render.
  const [hoy] = useState(() => fechaLocalISO(new Date()))

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault()
    const nuevosErrores: Record<string, string> = {}

    // Se chequea antes de crear la lápida: si el archivo no entra, no tiene
    // sentido publicar una lápida y fallar después en la subida.
    if (foto && foto.size > TAMANIO_MAXIMO_FOTO) {
      nuevosErrores.foto = 'La foto no puede superar los 5 MB.'
    }
    if (!nombrePlanta.trim()) nuevosErrores.nombrePlanta = 'El nombre de la planta es obligatorio.'
    if (!categoriaId) nuevosErrores.categoriaId = 'Elegí una categoría.'
    if (!fechaFallecimiento) {
      nuevosErrores.fechaFallecimiento = 'La fecha de fallecimiento es obligatoria.'
    } else if (fechaFallecimiento > hoy) {
      nuevosErrores.fechaFallecimiento = 'La fecha de fallecimiento no puede ser futura.'
    } else if (fechaFallecimiento < FECHA_MINIMA) {
      nuevosErrores.fechaFallecimiento = 'La fecha de fallecimiento no puede ser anterior a 1900.'
    }
    if (!causaMuerte.trim()) nuevosErrores.causaMuerte = 'La causa de muerte es obligatoria.'
    if (!epitafio.trim()) nuevosErrores.epitafio = 'El epitafio es obligatorio.'

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores)
      return
    }

    setErrores({})
    setEnviando(true)
    try {
      await onPublicar(
        {
          nombrePlanta: nombrePlanta.trim(),
          epitafio: epitafio.trim(),
          fechaFallecimiento,
          categoriaId: Number(categoriaId),
          causaMuerte: causaMuerte.trim(),
        },
        foto,
      )
    } catch (fallo) {
      if (fallo instanceof ApiError) {
        setErrores({ general: fallo.message })
      } else {
        setErrores({ general: 'No se pudo publicar la lápida. Revisá los datos e intentalo de nuevo.' })
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="publicar">
      <form className="publicar__tarjeta" onSubmit={manejarEnvio} noValidate>
        <h1 className="publicar__titulo">NUEVA LÁPIDA</h1>

        <CampoTexto
          id="foto"
          etiqueta="Foto (opcional)"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          ayuda="JPEG, PNG o WebP, hasta 5 MB. Se sube después de publicar."
          error={errores.foto}
          onChange={(e) => {
            setFoto(e.target.files?.[0])
            setErrores((err) => ({ ...err, foto: '' }))
          }}
        />

        <CampoTexto
          id="nombre"
          etiqueta="Nombre de la planta"
          placeholder="Ej. Pepino"
          maxLength={40}
          required
          value={nombrePlanta}
          error={errores.nombrePlanta}
          onChange={(e) => {
            setNombrePlanta(e.target.value)
            setErrores((err) => ({ ...err, nombrePlanta: '' }))
          }}
        />

        <div className="fila">
          <CampoSelect
            id="categoria"
            etiqueta="Categoría"
            required
            value={categoriaId}
            error={errores.categoriaId}
            onChange={(e) => {
              setCategoriaId(e.target.value)
              setErrores((err) => ({ ...err, categoriaId: '' }))
            }}
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
            min={FECHA_MINIMA}
            max={hoy}
            value={fechaFallecimiento}
            error={errores.fechaFallecimiento}
            onChange={(e) => {
              setFechaFallecimiento(e.target.value)
              setErrores((err) => ({ ...err, fechaFallecimiento: '' }))
            }}
          />
        </div>

        <CampoTexto
          id="causa"
          etiqueta="Causa de muerte"
          placeholder="Ej. exceso de agua"
          maxLength={80}
          required
          value={causaMuerte}
          error={errores.causaMuerte}
          onChange={(e) => {
            setCausaMuerte(e.target.value)
            setErrores((err) => ({ ...err, causaMuerte: '' }))
          }}
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
          error={errores.epitafio}
          onChange={(e) => {
            setEpitafio(e.target.value)
            setErrores((err) => ({ ...err, epitafio: '' }))
          }}
        />

        {errores.general && <Aviso tono="error">{errores.general}</Aviso>}

        <Boton type="submit" disabled={enviando || categorias.length === 0}>
          {enviando ? 'PUBLICANDO…' : 'PUBLICAR LÁPIDA'}
        </Boton>
      </form>
    </div>
  )
}
