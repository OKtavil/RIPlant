import { useEffect, useState } from 'react'
import { ApiError } from '../../../shared/api/client'
import { Aviso } from '../../../shared/ui/Aviso'
import { Boton } from '../../../shared/ui/Boton'
import { CampoArea, CampoTexto } from '../../../shared/ui/Campo'
import { useFormErrorPulse } from '../../../shared/ui/useFormErrorPulse'
import { IconoInsignia, IconoPersona } from '../../../shared/ui/iconos'
import { insigniaSuperviviente, type Session } from '../../sesiones/model/sesion'
import type { ActualizarPerfil } from '../../usuarios/api/usuarios.api'
import type { Category } from '../../categorias/model/categoria'
import type { Asesino, Grave } from '../model/lapida'
import { esDuenio, puedeBorrar } from '../model/lapida'
import { GraveCard } from './GraveCard'

const TAMANIO_MAXIMO_FOTO = 5 * 1024 * 1024

type Props = {
  sesion: Session | null
  /** Usuario realmente conectado; `sesion` puede representar otro perfil. */
  sesionParaAcciones?: Session | null
  lapidas: Grave[]
  categorias: Category[]
  asesinos: Asesino[]
  onAbrir: (lapida: Grave) => void
  onCorona?: (lapida: Grave) => Promise<void>
  onPublicar: () => void
  onBorrar: (lapida: Grave) => Promise<void>
  onIniciarSesion: () => void
  onActualizarPerfil?: (datos: ActualizarPerfil) => Promise<void>
  /**
   * Emite un código de recuperación nuevo para el propio usuario, probando la
   * contraseña actual. Devuelve el código en claro, que se muestra una sola vez.
   * Sin esta prop la sección no existe (perfil ajeno o ruta sin backend).
   */
  onEmitirCodigoRecuperacion?: (passwordActual: string) => Promise<string>
  /**
   * Perfil ajeno: se ve todo, no se ofrece ninguna acción de escritura. Sin
   * esto, `puedeBorrar` compararía contra el usuario retratado y mostraría
   * botones que el backend rechaza con 403.
   */
  soloLectura?: boolean
}

function formatearFechaCorta(fecha: string): string {
  const soloFecha = fecha.slice(0, 10)
  const [anio, mes, dia] = soloFecha.split('-')
  if (!anio || !mes || !dia) return fecha
  return `${dia}/${mes}/${anio}`
}

export function PerfilPage({
  sesion,
  sesionParaAcciones = sesion,
  lapidas,
  categorias,
  asesinos,
  onAbrir,
  onCorona,
  onBorrar,
  onIniciarSesion,
  onActualizarPerfil,
  onEmitirCodigoRecuperacion,
  soloLectura = false,
}: Props) {
  const [editando, setEditando] = useState(false)
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [errorPerfil, setErrorPerfil] = useState('')
  const [erroresPerfil, setErroresPerfil] = useState<Record<string, string>>({})
  const descripcionSesion = sesion?.descripcion ?? ''
  const [descripcion, setDescripcion] = useState(descripcionSesion)
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [foto, setFoto] = useState<{ archivo: File; vistaPrevia: string }>()
  // El borrador sigue a la sesión: si la descripción cambia por fuera (guardado
  // en otra pestaña, refresco de `/sesiones/actual`), reabrir el editor no debe
  // mostrar el valor viejo. Ajustar el estado durante el render es el patrón que
  // recomienda React y evita el render extra de un `useEffect`.
  const [descripcionPrevia, setDescripcionPrevia] = useState(descripcionSesion)
  if (descripcionPrevia !== descripcionSesion) {
    setDescripcionPrevia(descripcionSesion)
    setDescripcion(descripcionSesion)
  }
  useEffect(() => {
    return () => {
      if (foto) URL.revokeObjectURL(foto.vistaPrevia)
    }
  }, [foto])
  // La identidad sale de `usuarioId` (presente incluso en la lápida recién
  // publicada) y, si falta, de `duenio.username`. Ver `esDuenio`.
  const propias = lapidas.filter((lapida) => esDuenio(lapida, sesion))
  const coronasRecibidas = propias.reduce((total, lapida) => total + lapida.coronasCount, 0)
  const misMuertes = asesinos.find((a) => a.username === sesion?.username)?.muertes ?? 0
  const nombreCategoria = (id: number) => categorias.find((c) => c.id === id)?.nombre
  const insignia = insigniaSuperviviente(sesion)
  const puedeEditarPerfil = !!sesion && !!onActualizarPerfil && !soloLectura
  const puedeEmitirCodigo =
    !!sesion && !!onEmitirCodigoRecuperacion && !soloLectura
  const [pidiendoCodigo, setPidiendoCodigo] = useState(false)
  const [passwordCodigo, setPasswordCodigo] = useState('')
  const [generandoCodigo, setGenerandoCodigo] = useState(false)
  const [codigoNuevo, setCodigoNuevo] = useState('')
  const [errorCodigo, setErrorCodigo] = useState('')
  const pulsoEditor = useFormErrorPulse()
  const pulsoCodigo = useFormErrorPulse()

  return (
    <>
      <section className="perfil__cabecera">
        <div className="perfil__avatar">
          {sesion?.avatarUrl ? (
            <img src={sesion.avatarUrl} alt={`Imagen de ${sesion.username}`} />
          ) : (
            <IconoPersona />
          )}
        </div>
        <div className="perfil__identidad">
          <h1 className="perfil__nombre">{sesion ? sesion.username : 'Invitado'}</h1>
          <p className="perfil__desde">
            {sesion ? (sesion.descripcion || 'Sin descripción') : 'Iniciá sesión para ver tu jardín'}
          </p>
        </div>
        {puedeEditarPerfil && (
          <Boton tamano="chico" onClick={() => setEditando(true)}>
            EDITAR PERFIL
          </Boton>
        )}
        {!sesion && (
          <Boton tamano="chico" onClick={onIniciarSesion}>
            INICIAR SESIÓN
          </Boton>
        )}
      </section>

      {editando && puedeEditarPerfil && (
        <div className="perfil__editor-contenedor">
          <form
            className="publicar__tarjeta perfil__editor"
            data-error-pulse={pulsoEditor.errorPulse}
            onSubmitCapture={pulsoEditor.onSubmitCapture}
            noValidate
            onSubmit={async (evento) => {
              evento.preventDefault()
              setErrorPerfil('')
              const nuevosErrores: Record<string, string> = {}
              if (foto && foto.archivo.size > TAMANIO_MAXIMO_FOTO) {
                nuevosErrores.foto = 'La imagen no puede superar los 5 MB.'
              }
              if (passwordNueva.length > 0 && passwordNueva.length < 8) {
                nuevosErrores.passwordNueva = 'La contraseña necesita al menos 8 caracteres.'
              }
              if (passwordNueva && !passwordActual) {
                nuevosErrores.passwordActual = 'Ingresá tu contraseña actual para cambiarla.'
              }
              if (Object.keys(nuevosErrores).length > 0) {
                setErroresPerfil(nuevosErrores)
                return
              }

              setErroresPerfil({})
              setGuardandoPerfil(true)
              try {
                await onActualizarPerfil({
                  descripcion,
                  ...(foto ? { foto: foto.archivo } : {}),
                  ...(passwordNueva ? { passwordActual, passwordNueva } : {}),
                })
                setPasswordActual('')
                setPasswordNueva('')
                setFoto(undefined)
                setEditando(false)
              } catch (fallo) {
                setErrorPerfil(
                  fallo instanceof ApiError ? fallo.message : 'No se pudo guardar el perfil.',
                )
              } finally {
                setGuardandoPerfil(false)
              }
            }}
          >
            <h2 className="publicar__titulo">EDITAR PERFIL</h2>
            <p className="perfil__editor-ayuda">
              Actualizá solo los datos que quieras cambiar. Los campos son opcionales.
            </p>

            <CampoTexto
              id="perfil-foto"
              etiqueta="Imagen de perfil (opcional)"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              ayuda="JPEG, PNG o WebP, hasta 5 MB, desde 96 px por lado."
              error={erroresPerfil.foto}
              onChange={(evento) => {
                const archivo = evento.target.files?.[0]
                setFoto(
                  archivo
                    ? { archivo, vistaPrevia: URL.createObjectURL(archivo) }
                    : undefined,
                )
                setErroresPerfil((actuales) => ({ ...actuales, foto: '' }))
              }}
            />
            <div className="perfil__editor-imagenes">
              <figure className="vista-previa perfil__editor-vista-previa">
                <figcaption className="vista-previa__titulo">IMAGEN ACTUAL</figcaption>
                <div className="perfil__editor-avatar">
                  {sesion?.avatarUrl ? (
                    <img src={sesion.avatarUrl} alt="Imagen actual del perfil" />
                  ) : (
                    <IconoPersona />
                  )}
                </div>
              </figure>
              {foto && (
                <figure className="vista-previa perfil__editor-vista-previa">
                  <figcaption className="vista-previa__titulo">VISTA PREVIA</figcaption>
                  <div className="perfil__editor-avatar">
                    <img src={foto.vistaPrevia} alt="Vista previa de la nueva imagen de perfil" />
                  </div>
                </figure>
              )}
            </div>

            <CampoArea
              id="perfil-descripcion"
              etiqueta="Descripción (opcional)"
              maxLength={280}
              rows={3}
              value={descripcion}
              ayuda={`${descripcion.length}/280 caracteres`}
              onChange={(evento) => setDescripcion(evento.target.value)}
            />

            <CampoTexto
              id="perfil-password-nueva"
              etiqueta="Nueva contraseña (opcional)"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              value={passwordNueva}
              error={erroresPerfil.passwordNueva}
              ayuda="Dejá este campo vacío si no querés cambiarla."
              onChange={(evento) => {
                setPasswordNueva(evento.target.value)
                setErroresPerfil((actuales) => ({ ...actuales, passwordNueva: '' }))
              }}
            />
            {passwordNueva && (
              <CampoTexto
                id="perfil-password-actual"
                etiqueta="Contraseña actual"
                type="password"
                autoComplete="current-password"
                required
                maxLength={72}
                value={passwordActual}
                error={erroresPerfil.passwordActual}
                onChange={(evento) => {
                  setPasswordActual(evento.target.value)
                  setErroresPerfil((actuales) => ({ ...actuales, passwordActual: '' }))
                }}
              />
            )}

            {errorPerfil && <Aviso tono="error">{errorPerfil}</Aviso>}
            <div className="perfil__editor-acciones">
              <Boton type="submit" disabled={guardandoPerfil}>
                {guardandoPerfil ? 'GUARDANDO…' : 'GUARDAR PERFIL'}
              </Boton>
              <Boton
                type="button"
                variante="peligro"
                disabled={guardandoPerfil}
                onClick={() => {
                  setDescripcion(descripcionSesion)
                  setPasswordActual('')
                  setPasswordNueva('')
                  setFoto(undefined)
                  setErrorPerfil('')
                  setErroresPerfil({})
                  setEditando(false)
                }}
              >
                CANCELAR
              </Boton>
            </div>
          </form>
        </div>
      )}

      <section className="perfil__stats">
        <div className="perfil__stat">
          <p className="perfil__stat-valor perfil__stat-valor--rojo">{misMuertes}</p>
          <p className="perfil__stat-etiqueta">Plantas asesinadas</p>
        </div>
        <div className="perfil__stat">
          <p className="perfil__stat-valor perfil__stat-valor--madera">{coronasRecibidas}</p>
          <p className="perfil__stat-etiqueta">Coronas recibidas</p>
        </div>
        <div
          className={`perfil__stat perfil__stat--insignia${
            insignia ? ' perfil__stat--obtenida' : ''
          }`}
        >
          <IconoInsignia />
          <p className="perfil__insignia-texto">
            <strong>Superviviente Zombie</strong>
            <br />
            {insignia ? (
              <>Obtenida · {formatearFechaCorta(insignia.obtenidaEn)}</>
            ) : (
              <>Aún no obtenida</>
            )}
          </p>
        </div>
      </section>

      {!insignia && (
        <Aviso tono="pendiente">
          <strong>Superviviente Zombie:</strong> editá una de tus lápidas para que
          vuelva a mostrar señales de vida. La primera vez que la revivas se te otorga la
          insignia al dueño.
        </Aviso>
      )}

      {puedeEmitirCodigo && (
        <section style={{ padding: '0 24px', marginBottom: 16 }}>
          <h2 className="perfil__seccion">CÓDIGO DE RECUPERACIÓN</h2>
          {codigoNuevo ? (
            <>
              <p style={{ marginBottom: 8 }}>
                <strong>Guardalo ahora:</strong> no se vuelve a mostrar y reemplaza al anterior.
              </p>
              <p style={{ fontFamily: 'var(--fuente-pixel)', fontSize: 16, letterSpacing: 1, wordBreak: 'break-all', margin: '8px 0' }}>{codigoNuevo}</p>
            </>
          ) : pidiendoCodigo ? (
            <form
              data-error-pulse={pulsoCodigo.errorPulse}
              onSubmitCapture={pulsoCodigo.onSubmitCapture}
              onSubmit={async (evento) => {
                evento.preventDefault()
                setErrorCodigo('')
                setGenerandoCodigo(true)
                try {
                  setCodigoNuevo(await onEmitirCodigoRecuperacion!(passwordCodigo))
                } catch (fallo) {
                  setErrorCodigo(
                    fallo instanceof ApiError
                      ? fallo.message
                      : 'No se pudo generar el código de recuperación.',
                  )
                } finally {
                  setGenerandoCodigo(false)
                }
              }}
            >
              <CampoTexto
                id="perfil-password-codigo"
                etiqueta="CONTRASEÑA ACTUAL"
                type="password"
                autoComplete="current-password"
                required
                maxLength={72}
                value={passwordCodigo}
                error={errorCodigo}
                ayuda="La pedimos para que nadie con tu sesión abierta pueda rotar el código."
                onChange={(e) => {
                  setPasswordCodigo(e.target.value)
                  setErrorCodigo('')
                }}
              />
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <Boton type="submit" tamano="chico" disabled={generandoCodigo}>
                  {generandoCodigo ? 'GENERANDO…' : 'CONFIRMAR Y GENERAR'}
                </Boton>
                <Boton
                  type="button"
                  tamano="chico"
                  onClick={() => {
                    setPidiendoCodigo(false)
                    setPasswordCodigo('')
                    setErrorCodigo('')
                  }}
                >
                  CANCELAR
                </Boton>
              </div>
            </form>
          ) : (
            <>
              <p style={{ marginBottom: 8 }}>
                Si perdiste el código que te dimos al crear la cuenta, generá uno nuevo. El
                anterior deja de servir.
              </p>
              <Boton tamano="chico" onClick={() => setPidiendoCodigo(true)}>
                GENERAR CÓDIGO NUEVO
              </Boton>
            </>
          )}
        </section>
      )}

      <h2 className="perfil__seccion">SU CEMENTERIO</h2>

      <div className="grilla grilla--cuatro">
        {propias.map((lapida) => (
          <GraveCard
            key={lapida.id}
            lapida={lapida}
            tamano="baja"
            categoria={nombreCategoria(lapida.categoriaId)}
            onAbrir={onAbrir}
            {...(onCorona ? { onCorona: (grave: Grave) => void onCorona(grave) } : {})}
            propia={esDuenio(lapida, sesionParaAcciones)}
            {...(puedeBorrar(lapida, sesion) && !soloLectura ? { onBorrar } : {})}
          />
        ))}
      </div>
    </>
  )
}
