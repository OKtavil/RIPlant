import { useEffect, useRef, useState } from 'react'
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
   * Identidad de la sesión actual. El borrador se descarta cuando cambia (E006):
   * el formulario no puede mostrarle a una persona lo que escribió otra.
   */
  sesionId?: string | null
  /**
   * Publica la lápida. El segundo argumento es la foto elegida, si hay: el
   * padre la sube después de crear la lápida, porque el endpoint de la foto
   * cuelga del `id` que devuelve el `POST /lapidas`.
   */
  onPublicar: (input: CreateGraveInput, foto?: File) => Promise<void>
}

/** Todo lo que la persona escribió y todavía no publicó. */
type Borrador = {
  nombrePlanta: string
  categoriaId: string
  fechaFallecimiento: string
  causaMuerte: string
  epitafio: string
  foto?: File
  /** Object URL de `foto`, solo para la vista previa (R002). */
  fotoUrl: string | null
}

const BORRADOR_VACIO: Borrador = {
  nombrePlanta: '',
  categoriaId: '',
  fechaFallecimiento: '',
  causaMuerte: '',
  epitafio: '',
  foto: undefined,
  fotoUrl: null,
}

export function PublicarPage({ categorias, sesionId = null, onPublicar }: Props) {
  const [borrador, setBorrador] = useState<Borrador>(BORRADOR_VACIO)
  // La sesión dueña del borrador. Si cambia, lo escrito se descarta (E006).
  const [sesionDelBorrador, setSesionDelBorrador] = useState<string | null>(sesionId)
  const [enviando, setEnviando] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})
  // Se captura al montar: el formulario no vive más de un día, y así el render
  // no llama a `new Date()` (función impura) en cada re-render.
  const [hoy] = useState(() => fechaLocalISO(new Date()))
  /**
   * Último object URL vivo. Se crea en el manejador del `input`, no en un
   * efecto: crear el blob durante el render lo duplicaría en StrictMode y uno
   * de los dos quedaría sin revocar.
   */
  const urlViva = useRef<string | null>(null)

  useEffect(
    () => () => {
      if (urlViva.current) URL.revokeObjectURL(urlViva.current)
    },
    [],
  )

  /**
   * Cambia la foto y su vista previa. Revoca el blob anterior en el acto: sin
   * esto, cada foto elegida dejaría uno retenido hasta desmontar el formulario.
   */
  function elegirFoto(archivo: File | undefined) {
    if (urlViva.current) URL.revokeObjectURL(urlViva.current)
    const url = archivo ? URL.createObjectURL(archivo) : null
    urlViva.current = url
    setBorrador((previo) => ({ ...previo, foto: archivo, fotoUrl: url }))
    setErrores((err) => ({ ...err, foto: '' }))
  }

  // Ajuste de estado durante el render, el patrón que recomienda React para
  // reaccionar a un cambio de props: se aplica antes de pintar, sin el frame
  // con los datos viejos que dejaría un `useEffect`.
  if (sesionId !== sesionDelBorrador) {
    setSesionDelBorrador(sesionId)
    setBorrador(BORRADOR_VACIO)
    setErrores({})
  }

  function actualizar<K extends keyof Borrador>(campo: K, valor: Borrador[K]) {
    setBorrador((previo) => ({ ...previo, [campo]: valor }))
  }

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault()
    const { nombrePlanta, categoriaId, fechaFallecimiento, causaMuerte, epitafio, foto } = borrador
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
          onChange={(e) => elegirFoto(e.target.files?.[0])}
        />

        {/* R002: la foto se elige a ciegas si no se muestra cómo entra en la
            tarjeta. Se reusan las clases de `GraveCard` para que la previa sea
            el diseño real y no una aproximación que se desincronice. */}
        {borrador.fotoUrl && (
          <figure className="vista-previa">
            <figcaption className="vista-previa__titulo">ASÍ SE VA A VER</figcaption>
            <div className="lapida vista-previa__lapida">
              <div className="lapida__foto lapida__foto--alta">
                <img
                  className="lapida__foto-img"
                  src={borrador.fotoUrl}
                  alt="Vista previa de la foto elegida"
                />
              </div>
              <p className="lapida__nombre">
                “{borrador.nombrePlanta.trim() || 'Nombre de la planta'}”
              </p>
              <p className="lapida__epitafio">
                {borrador.epitafio.trim() || 'Tu epitafio acá'}
              </p>
            </div>
          </figure>
        )}

        <CampoTexto
          id="nombre"
          etiqueta="Nombre de la planta"
          placeholder="Ej. Pepino"
          maxLength={40}
          required
          value={borrador.nombrePlanta}
          error={errores.nombrePlanta}
          onChange={(e) => {
            actualizar('nombrePlanta', e.target.value)
            setErrores((err) => ({ ...err, nombrePlanta: '' }))
          }}
        />

        <div className="fila">
          <CampoSelect
            id="categoria"
            etiqueta="Categoría"
            required
            value={borrador.categoriaId}
            error={errores.categoriaId}
            onChange={(e) => {
              actualizar('categoriaId', e.target.value)
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
            value={borrador.fechaFallecimiento}
            error={errores.fechaFallecimiento}
            onChange={(e) => {
              actualizar('fechaFallecimiento', e.target.value)
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
          value={borrador.causaMuerte}
          error={errores.causaMuerte}
          onChange={(e) => {
            actualizar('causaMuerte', e.target.value)
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
          value={borrador.epitafio}
          error={errores.epitafio}
          onChange={(e) => {
            actualizar('epitafio', e.target.value)
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
