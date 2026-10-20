import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError } from '../shared/api/client'
import { Aviso } from '../shared/ui/Aviso'
import { Nav, type Vista } from '../shared/ui/Nav'
import { CategoriasPage } from '../features/categorias/ui/CategoriasPage'
import { categoriasApi } from '../features/categorias/api/categorias.api'
import type { Category } from '../features/categorias/model/categoria'
import { DetallePage } from '../features/lapidas/ui/DetallePage'
import { InicioPage } from '../features/lapidas/ui/InicioPage'
import { PerfilPage } from '../features/lapidas/ui/PerfilPage'
import { PublicarPage } from '../features/lapidas/ui/PublicarPage'
import { RankingPage } from '../features/lapidas/ui/RankingPage'
import { lapidasApi } from '../features/lapidas/api/lapidas.api'
import type { Asesino, CreateGraveInput, Grave } from '../features/lapidas/model/lapida'
import { LoginPage } from '../features/sesiones/ui/LoginPage'
import { RecuperarPage } from '../features/sesiones/ui/RecuperarPage'
import { RegistroPage } from '../features/sesiones/ui/RegistroPage'
import { RestablecerPage } from '../features/sesiones/ui/RestablecerPage'
import { sesionesApi } from '../features/sesiones/api/sesiones.api'
import type { Credenciales, Session, VistaAuth } from '../features/sesiones/model/sesion'

const MENU: Vista[] = ['inicio', 'ranking', 'publicar']

export default function App() {
  const [vista, setVista] = useState<Vista>('inicio')
  const [vistaAuth, setVistaAuth] = useState<VistaAuth | null>(null)
  const [lapidas, setLapidas] = useState<Grave[]>([])
  const [categorias, setCategorias] = useState<Category[]>([])
  const [asesinos, setAsesinos] = useState<Asesino[]>([])
  const [errorAsesinos, setErrorAsesinos] = useState('')
  const [seleccionada, setSeleccionada] = useState<Grave | null>(null)
  const [sesion, setSesion] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    let vigente = true
    ;(async () => {
      try {
        const [lapidasCargadas, categoriasCargadas] = await Promise.all([
          lapidasApi.findAll(),
          categoriasApi.findAll(),
        ])
        if (!vigente) return
        setLapidas(lapidasCargadas)
        setCategorias(categoriasCargadas)
      } catch {
        if (vigente) setAviso('No se pudo conectar con el backend.')
      } finally {
        if (vigente) setCargando(false)
      }

      try {
        const actual = await sesionesApi.actual()
        if (vigente) setSesion(actual)
      } catch {
        // Sin sesión: es un estado válido, no un error.
      }

      // El ranking de asesinos se carga aparte: si falla, el cementerio igual
      // se muestra y la sección avisa su propio error.
      try {
        const ranking = await lapidasApi.asesinos()
        if (vigente) setAsesinos(ranking)
      } catch (fallo) {
        if (vigente)
          setErrorAsesinos(
            fallo instanceof ApiError
              ? fallo.message
              : 'No se pudo cargar el ranking de asesinos.',
          )
      }
    })()
    return () => {
      vigente = false
    }
  }, [])

  const conteoLapidas = useCallback(
    (categoriaId: number) => lapidas.filter((l) => l.categoriaId === categoriaId).length,
    [lapidas],
  )

  async function ingresar(credenciales: Credenciales) {
    const actual = await sesionesApi.iniciar(credenciales)
    setSesion(actual)
    setVistaAuth(null)
    setVista('inicio')
  }

  /** El backend registra y deja la cookie puesta: entra logueado, igual que el login. */
  async function registrar(credenciales: Credenciales) {
    const actual = await sesionesApi.registrar(credenciales)
    setSesion(actual)
    setVistaAuth(null)
    setVista('inicio')
  }

  async function cerrarSesion() {
    await sesionesApi.cerrar()
    setSesion(null)
    setVista('inicio')
  }

  async function publicar(input: CreateGraveInput) {
    const creada = await lapidasApi.create(input)
    setLapidas((items) => [creada, ...items])
    setVista('inicio')
  }

  async function darCorona(lapida: Grave) {
    try {
      const actualizada = await lapidasApi.giveCorona(lapida.id)
      setLapidas((items) => items.map((item) => (item.id === actualizada.id ? actualizada : item)))
      setSeleccionada((actual) => (actual?.id === actualizada.id ? actualizada : actual))
    } catch (fallo) {
      setAviso(fallo instanceof ApiError ? fallo.message : 'No se pudo dar la corona.')
    }
  }

  async function crearCategoria(nombre: string) {
    const creada = await categoriasApi.create(nombre)
    setCategorias((items) => [...items, creada])
  }

  async function actualizarCategoria(id: number, nombre: string) {
    const actualizada = await categoriasApi.update(id, nombre)
    setCategorias((items) => items.map((item) => (item.id === id ? actualizada : item)))
  }

  async function eliminarCategoria(id: number) {
    await categoriasApi.remove(id)
    setCategorias((items) => items.filter((item) => item.id !== id))
  }

  const navItems = useMemo(() => MENU, [])
  const vistaActiva: Vista | null = vistaAuth ? null : vista

  if (vistaAuth) {
    return (
      <div className="pantalla">
        <Nav activa={null} items={[]} onNavegar={() => setVistaAuth(null)} />
        {vistaAuth === 'login' && <LoginPage onIngresar={ingresar} onNavegar={setVistaAuth} />}
        {vistaAuth === 'registro' && (
          <RegistroPage onRegistrar={registrar} onNavegar={setVistaAuth} />
        )}
        {vistaAuth === 'recuperar' && <RecuperarPage onNavegar={setVistaAuth} />}
        {vistaAuth === 'restablecer' && <RestablecerPage onNavegar={setVistaAuth} />}
      </div>
    )
  }

  return (
    <div className="pantalla">
      <Nav activa={vistaActiva} items={navItems} onNavegar={setVista} />

      <div className="pantalla__acciones">
        {sesion ? (
          <>
            <button className="nav__item" onClick={() => setVista('perfil')}>
              @{sesion.username}
            </button>
            <button className="nav__item" onClick={() => void cerrarSesion()}>
              SALIR
            </button>
          </>
        ) : (
          <button className="nav__item" onClick={() => setVistaAuth('login')}>
            INICIAR SESIÓN
          </button>
        )}
      </div>

      {aviso && <Aviso tono="error">{aviso}</Aviso>}

      {cargando ? (
        <Aviso>Cargando el cementerio…</Aviso>
      ) : seleccionada ? (
        <DetallePage
          lapida={seleccionada}
          categorias={categorias}
          onCorona={darCorona}
          onVolver={() => setSeleccionada(null)}
        />
      ) : (
        <>
          {vista === 'inicio' && (
            <InicioPage
              lapidas={lapidas}
              categorias={categorias}
              asesinos={asesinos}
              errorAsesinos={errorAsesinos}
              onAbrir={setSeleccionada}
              onCorona={(l) => void darCorona(l)}
              onPublicar={() => setVista('publicar')}
            />
          )}
          {vista === 'ranking' && (
            <RankingPage
              lapidas={lapidas}
              categorias={categorias}
              asesinos={asesinos}
              errorAsesinos={errorAsesinos}
              onAbrir={setSeleccionada}
            />
          )}
          {vista === 'publicar' && <PublicarPage categorias={categorias} onPublicar={publicar} />}
          {vista === 'perfil' && (
            <PerfilPage
              sesion={sesion}
              lapidas={lapidas}
              categorias={categorias}
              asesinos={asesinos}
              onAbrir={setSeleccionada}
              onPublicar={() => setVista('publicar')}
              onIniciarSesion={() => setVistaAuth('login')}
            />
          )}
          {vista === 'categorias' && (
            <CategoriasPage
              categorias={categorias}
              conteoLapidas={conteoLapidas}
              sesion={sesion}
              onCrear={crearCategoria}
              onActualizar={actualizarCategoria}
              onEliminar={eliminarCategoria}
            />
          )}
        </>
      )}

      {!seleccionada && sesion?.rol === 'admin' && vista !== 'categorias' && (
        <button className="nav__item" onClick={() => setVista('categorias')}>
          ADMINISTRAR CATEGORÍAS
        </button>
      )}
    </div>
  )
}
