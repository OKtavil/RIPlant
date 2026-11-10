import { useEffect, useState } from 'react'
import { Boton } from '../../../shared/ui/Boton'
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
  /** Lleva a la vista propia, donde sí se puede editar la descripción. */
  onIrAMiPerfil: () => void
}

export function PerfilesPage({
  sesion,
  lapidas,
  categorias,
  asesinos,
  onAbrir,
  onPublicar,
  onBorrar,
  onIrAMiPerfil,
}: Props) {
  const [usuarios, setUsuarios] = useState<UsuarioPublico[]>([])
  const [seleccionado, setSeleccionado] = useState<string | null>(null)

  useEffect(() => {
    void usuariosApi.listar().then(setUsuarios).catch(() => setUsuarios([]))
  }, [])

  if (seleccionado) {
    const usuario = usuarios.find((u) => u.id === seleccionado)

    // La lista pudo recargarse sin ese id: se muestra el estado vacío en vez de
    // tocar el estado durante el render.
    if (!usuario) {
      return (
        <div className="pantalla__contenido">
          <Boton tamano="chico" onClick={() => setSeleccionado(null)}>
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
          <Boton tamano="chico" onClick={() => setSeleccionado(null)}>
            VOLVER A PERFILES
          </Boton>
          {esPropio && (
            <Boton tamano="chico" onClick={onIrAMiPerfil}>
              IR A MI PERFIL
            </Boton>
          )}
        </div>
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
          lapidas={esPropio ? lapidas : propias}
          categorias={categorias}
          asesinos={asesinos}
          onAbrir={onAbrir}
          onPublicar={onPublicar}
          onBorrar={onBorrar}
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
            <button
              key={usuario.id}
              onClick={() => setSeleccionado(usuario.id)}
              style={{
                textAlign: 'left',
                background: '#f5f1e8',
                border: '2px solid #8b7355',
                padding: 16,
                borderRadius: 8,
                cursor: 'pointer',
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
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
