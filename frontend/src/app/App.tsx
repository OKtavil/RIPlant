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
import { rutaDeDetalle, rutaDeVista } from './ruta'
import { useRuta } from './useRuta'

const MENU: Vista[] = ['inicio', 'ranking', 'publicar']

export default function App() {
  const { ruta, navegar } = useRuta()
  const [vistaAuth, setVistaAuth] = useState<VistaAuth | null>(null)
  const [lapidas, setLapidas] = useState<Grave[]>([])
  const [categorias, setCategorias] = useState<Category[]>([])
  const [asesinos, setAsesinos] = useState<Asesino[]>([])
  const [errorAsesinos, setErrorAsesinos] = useState('')
  const [sesion, setSesion] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)
  const [aviso, setAviso] = useState('')

  // La URL es la fuente de verdad de qué se muestra. El detalle se resuelve
  // contra la lista ya cargada; si el id no está (link viejo, lápida borrada),
  // cae al inicio en vez de dejar la pantalla vacía.
  const detalleId = ruta.tipo === 'detalle' ? ruta.id : null
  const vista: Vista = ruta.tipo === 'vista' ? ruta.vista : 'inicio'
  const seleccionada = detalleId ? lapidas.find((l) => l.id === detalleId) ?? null : null

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
    navegar(rutaDeVista('inicio'))
  }

  /** El backend registra y deja la cookie puesta: entra logueado, igual que el login. */
  async function registrar(credenciales: Credenciales) {
    const actual = await sesionesApi.registrar(credenciales)
    setSesion(actual)
    setVistaAuth(null)
    navegar(rutaDeVista('inicio'))
  }

  async function cerrarSesion() {
    await sesionesApi.cerrar()
    setSesion(null)
    navegar(rutaDeVista('inicio'))
  }

  async function publicar(input: CreateGraveInput) {
    const creada = await lapidasApi.create(input)
    setLapidas((items) => [creada, ...items])
    navegar(rutaDeVista('inicio'))
  }

  async function darCorona(lapida: Grave) {
    try {
      const actualizada = await lapidasApi.giveCorona(lapida.id)
      setLapidas((items) => items.map((item) => (item.id === actualizada.id ? actualizada : item)))
    } catch (fallo) {
      setAviso(fallo instanceof ApiError ? fallo.message : 'No se pudo dar la corona.')
    }
  }

  async function borrarLapida(lapida: Grave) {
    try {
      await lapidasApi.remove(lapida.id)
      setLapidas((items) => items.filter((item) => item.id !== lapida.id))
      // Si se borró la que estaba abierta, la URL apunta a algo que ya no
      // existe: se vuelve al inicio para no quedar en un detalle fantasma.
      if (detalleId === lapida.id) navegar(rutaDeVista('inicio'))
      // Borrar cambia el ranking de asesinos: se recarga en vez de recalcularlo
      // en cliente, que daría una cuenta distinta a la del backend.
      const ranking = await lapidasApi.asesinos()
      setAsesinos(ranking)
    } catch (fallo) {
      setAviso(fallo instanceof ApiError ? fallo.message : 'No se pudo borrar la lápida.')
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

  /** Navegar por el menú escribe la URL de esa vista. */
  const irAVista = useCallback((destino: Vista) => navegar(rutaDeVista(destino)), [navegar])
  /** Abrir una lápida escribe la URL del detalle. */
  const abrirDetalle = useCallback(
    (lapida: Grave) => navegar(rutaDeDetalle(lapida.id)),
    [navegar],
  )

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
      <Nav
        activa={vistaActiva}
        items={navItems}
        onNavegar={irAVista}
        acciones={
          sesion ? (
            <>
              <button className="nav__item" onClick={() => irAVista('perfil')}>
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
          )
        }
      />

      {aviso && <Aviso tono="error">{aviso}</Aviso>}

      {cargando ? (
        <Aviso>Cargando el cementerio…</Aviso>
      ) : seleccionada ? (
        <DetallePage
          lapida={seleccionada}
          categorias={categorias}
          sesion={sesion}
          onCorona={darCorona}
          onBorrar={borrarLapida}
          onVolver={() => irAVista('inicio')}
        />
      ) : (
        <>
          {vista === 'inicio' && (
            <InicioPage
              lapidas={lapidas}
              categorias={categorias}
              asesinos={asesinos}
              errorAsesinos={errorAsesinos}
              onAbrir={abrirDetalle}
              onCorona={(l) => void darCorona(l)}
              onPublicar={() => irAVista('publicar')}
            />
          )}
          {vista === 'ranking' && (
            <RankingPage
              lapidas={lapidas}
              categorias={categorias}
              asesinos={asesinos}
              errorAsesinos={errorAsesinos}
              onAbrir={abrirDetalle}
            />
          )}
          {vista === 'publicar' && <PublicarPage categorias={categorias} onPublicar={publicar} />}
          {vista === 'perfil' && (
            <PerfilPage
              sesion={sesion}
              lapidas={lapidas}
              categorias={categorias}
              asesinos={asesinos}
              onAbrir={abrirDetalle}
              onPublicar={() => irAVista('publicar')}
              onBorrar={borrarLapida}
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
        <button className="nav__item" onClick={() => irAVista('categorias')}>
          ADMINISTRAR CATEGORÍAS
        </button>
      )}
    </div>
  )
}
