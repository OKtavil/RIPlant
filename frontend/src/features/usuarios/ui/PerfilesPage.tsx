import { useEffect, useState } from 'react'
import { rutaDePerfil, rutaDeVista } from '../../../app/ruta'
import { ApiError } from '../../../shared/api/client'
import { Aviso } from '../../../shared/ui/Aviso'
import { Boton } from '../../../shared/ui/Boton'
import { Enlace } from '../../../shared/ui/Enlace'
import { usuariosApi, type UsuarioPublico } from '../api/usuarios.api'
import type { Category } from '../../categorias/model/categoria'
import type { Asesino, Grave } from '../../lapidas/model/lapida'
import { esDuenio } from '../../lapidas/model/lapida'
import type { Session } from '../../sesiones/model/sesion'
import { PerfilPage } from '../../lapidas/ui/PerfilPage'

type Props = {
  sesion: Session | null
  lapidas: Grave[]
  categorias: Category[]
  asesinos: Asesino[]
  onAbrir: (lapida: Grave) => void
  onPublicar: () => void
  onBorrar: (lapida: Grave) => Promise<void>
  onCorona: (lapida: Grave) => Promise<void>
  /** Lleva a la vista propia, donde sí se puede editar la descripción. */
  onIrAMiPerfil: () => void
  /** Username de la URL (`/perfiles/:username`); `null` para la lista. */
  username: string | null
  /** Navegación interna: las tarjetas de la lista son links con URL real. */
  onNavegar: (destino: string) => void
}

export function PerfilesPage({
  sesion,
  lapidas,
  categorias,
  asesinos,
  onAbrir,
  onPublicar,
  onBorrar,
  onCorona,
  onIrAMiPerfil,
  username,
  onNavegar,
}: Props) {
  const [usuarios, setUsuarios] = useState<UsuarioPublico[]>([])
  // Antes de la primera respuesta la lista está vacía, y eso no significa que
  // el perfil de la URL ya no exista.
  const [cargando, setCargando] = useState(true)
  /**
   * Código recién emitido para el perfil ajeno, atado al username que lo pidió.
   * Así, al cambiar de perfil, el de la pantalla anterior deja de mostrarse sin
   * necesidad de limpiarlo desde un efecto.
   */
  const [emision, setEmision] = useState({ username: '', codigo: '', error: '' })
  const [emitiendo, setEmitiendo] = useState(false)

  function volverALista() {
    onNavegar(rutaDeVista('perfiles'))
  }

  useEffect(() => {
    let vigente = true
    void usuariosApi
      .listar()
      .then((lista) => {
        if (vigente) setUsuarios(lista)
      })
      .catch(() => {
        if (vigente) setUsuarios([])
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [])

  // El código de recuperación se emite para un perfil concreto: solo se muestra
  // en el perfil que lo pidió.
  const codigoEmitido = emision.username === username ? emision.codigo : ''
  const errorEmision = emision.username === username ? emision.error : ''

  const usuario = username ? usuarios.find((u) => u.username === username) : undefined

  if (username && cargando) {
    return <Aviso>Cargando el perfil…</Aviso>
  }

  if (username) {
    // La lista pudo recargarse sin ese username: se muestra el estado vacío en
    // vez de tocar el estado durante el render.
    if (!usuario) {
      return (
        <div className="pantalla__contenido">
          <Boton tamano="chico" onClick={volverALista}>
            VOLVER A PERFILES
          </Boton>
          <p className="lista__conteo">Ese perfil ya no está disponible.</p>
        </div>
      )
    }

    const esPropio = sesion?.id === usuario.id
    const propias = lapidas.filter((l) =>
      esDuenio(l, { id: usuario.id, username: usuario.username, rol: usuario.rol }),
    )

    return (
      <>
        <div style={{ padding: '0 24px', marginBottom: 12, display: 'flex', gap: 8 }}>
          <Boton tamano="chico" onClick={volverALista}>
            VOLVER A PERFILES
          </Boton>
          {esPropio && (
            <Boton tamano="chico" onClick={onIrAMiPerfil}>
              IR A MI PERFIL
            </Boton>
          )}
          {/* El admin es el último recurso cuando alguien perdió la contraseña
              Y el código. No pide contraseña ajena: sería imposible de probar. */}
          {!esPropio && sesion?.rol === 'admin' && (
            <Boton
              tamano="chico"
              disabled={emitiendo}
              onClick={async () => {
                setEmision({ username: usuario.username, codigo: '', error: '' })
                setEmitiendo(true)
                try {
                  const { codigoRecuperacion } = await usuariosApi.emitirCodigoRecuperacion(
                    usuario.id,
                  )
                  setEmision({ username: usuario.username, codigo: codigoRecuperacion, error: '' })
                } catch (fallo) {
                  setEmision({
                    username: usuario.username,
                    codigo: '',
                    error:
                      fallo instanceof ApiError
                        ? fallo.message
                        : 'No se pudo emitir el código de recuperación.',
                  })
                } finally {
                  setEmitiendo(false)
                }
              }}
            >
              {emitiendo ? 'EMITIENDO…' : 'EMITIR CÓDIGO DE RECUPERACIÓN'}
            </Boton>
          )}
        </div>
        {codigoEmitido && (
          <div style={{ padding: '0 24px', marginBottom: 12 }}>
            <p>
              <strong>Entregáselo a @{usuario.username}:</strong> no se vuelve a mostrar y
              reemplaza al anterior.
            </p>
            <p style={{ fontFamily: 'var(--fuente-pixel)', fontSize: 16, letterSpacing: 1, wordBreak: 'break-all', margin: '8px 0' }}>{codigoEmitido}</p>
          </div>
        )}
        {errorEmision && (
          <div style={{ padding: '0 24px', marginBottom: 12 }}>
            <Aviso tono="error">{errorEmision}</Aviso>
          </div>
        )}
        <PerfilPage
          // Sesión sintética: `PerfilPage` filtra las lápidas por `username`,
          // así que necesita la identidad del perfil retratado. `expiraEn` no
          // se usa en esa vista; la vista es de solo lectura.
          sesion={
            esPropio
              ? sesion
              : {
                  id: usuario.id,
                  username: usuario.username,
                  rol: usuario.rol === 'admin' ? 'admin' : 'usuario',
                  insignias: usuario.insignias ?? [],
                  descripcion: usuario.descripcion ?? '',
                  expiraEn: '',
                }
          }
          sesionParaAcciones={sesion}
          lapidas={esPropio ? lapidas : propias}
          categorias={categorias}
          asesinos={asesinos}
          onAbrir={onAbrir}
          onPublicar={onPublicar}
          onBorrar={onBorrar}
          onCorona={onCorona}
          onIniciarSesion={() => {}}
          soloLectura={!esPropio}
        />
      </>
    )
  }

  return (
    <div className="pantalla__contenido">
      <section className="feed">
        <div className="panel-oscuro">
          <h1 className="panel-oscuro__titulo">PERFILES</h1>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {usuarios.map((usuario) => (
            <Enlace
              key={usuario.id}
              href={rutaDePerfil(usuario.username)}
              onNavegar={onNavegar}
              style={{
                display: 'block',
                textAlign: 'left',
                background: '#f5f1e8',
                border: '2px solid #8b7355',
                padding: 16,
                borderRadius: 8,
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 18 }}>@{usuario.username}</div>
              {usuario.descripcion && (
                <div style={{ marginTop: 8, color: '#4a3f35' }}>{usuario.descripcion}</div>
              )}
              {!usuario.descripcion && (
                <div style={{ marginTop: 8, color: '#6b5d52', fontStyle: 'italic' }}>
                  Sin descripción
                </div>
              )}
            </Enlace>
          ))}
        </div>
      </section>
    </div>
  )
}
