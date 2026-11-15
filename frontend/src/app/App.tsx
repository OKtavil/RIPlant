import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '../shared/api/client'
import { Aviso } from '../shared/ui/Aviso'
import { Confirmacion } from '../shared/ui/Confirmacion'
import { Nav, type Vista } from '../shared/ui/Nav'
import { CategoriasPage } from '../features/categorias/ui/CategoriasPage'
import { categoriasApi } from '../features/categorias/api/categorias.api'
import type { Category } from '../features/categorias/model/categoria'
import { DetallePage } from '../features/lapidas/ui/DetallePage'
import { InicioPage } from '../features/lapidas/ui/InicioPage'
import { PerfilPage } from '../features/lapidas/ui/PerfilPage'
import { PerfilesPage } from '../features/usuarios/ui/PerfilesPage'
import { PublicarPage } from '../features/lapidas/ui/PublicarPage'
import { RankingPage } from '../features/lapidas/ui/RankingPage'
import { lapidasApi } from '../features/lapidas/api/lapidas.api'
import type { Asesino, CreateGraveInput, Grave } from '../features/lapidas/model/lapida'
import { LoginPage } from '../features/sesiones/ui/LoginPage'
import { RecuperarPage } from '../features/sesiones/ui/RecuperarPage'
import { RegistroPage } from '../features/sesiones/ui/RegistroPage'
import { sesionesApi } from '../features/sesiones/api/sesiones.api'
import { usuariosApi } from '../features/usuarios/api/usuarios.api'
import type {
  Credenciales,
  RecuperarPassword,
  Session,
  VistaAuth,
} from '../features/sesiones/model/sesion'
import { rutaDeDetalle, rutaDeVista } from './ruta'
import { useRuta } from './useRuta'

const MENU: Vista[] = ['inicio', 'ranking', 'publicar', 'perfiles']

export default function App() {
  const { ruta, navegar } = useRuta()
  const [vistaAuth, setVistaAuth] = useState<VistaAuth | null>(null)
  const [lapidas, setLapidas] = useState<Grave[]>([])
  const [categorias, setCategorias] = useState<Category[]>([])
  const [asesinos, setAsesinos] = useState<Asesino[]>([])
  const [errorAsesinos, setErrorAsesinos] = useState('')
  const [sesion, setSesion] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [aviso, setAviso] = useState('')
  const solicitudLapidas = useRef(0)
  const sesionAutenticada = useRef(false)
  // Lápida esperando confirmación de borrado (E004). `null` = no hay modal.
  const [lapidaAConfirmar, setLapidaAConfirmar] = useState<Grave | null>(null)

  // La URL es la fuente de verdad de qué se muestra. El detalle se resuelve
  // contra la lista ya cargada; si el id no está (link viejo, lápida borrada),
  // cae al inicio en vez de dejar la pantalla vacía.
  const detalleId = ruta.tipo === 'detalle' ? ruta.id : null
  const vista: Vista =
    ruta.tipo === 'vista' ? ruta.vista : ruta.tipo === 'perfilUsuario' ? 'perfiles' : 'inicio'
  /** Perfil pedido por la URL (`/perfiles/:username`), o `null` para la lista. */
  const usernamePerfil = ruta.tipo === 'perfilUsuario' ? ruta.username : null
  const seleccionada = detalleId ? lapidas.find((l) => l.id === detalleId) ?? null : null

  useEffect(() => {
    let vigente = true
    const solicitudInicial = ++solicitudLapidas.current

    // Las lecturas del arranque son independientes: ninguna necesita la
    // respuesta de otra, y cada una cuesta un viaje de red completo. Se
    // disparan juntas y cada una resuelve cuando llega (D002). Encadenarlas
    // triplicaba la espera sin ganar nada.
    //
    // El cementerio y las categorías solos gatean el esqueleto de carga: son
    // lo que la pantalla necesita para pintar algo útil.
    void (async () => {
      try {
        const [lapidasCargadas, categoriasCargadas] = await Promise.all([
          lapidasApi.findAll(),
          categoriasApi.findAll(),
        ])
        if (!vigente) return
        if (solicitudInicial === solicitudLapidas.current && !sesionAutenticada.current) {
          setLapidas(lapidasCargadas)
        }
        setCategorias(categoriasCargadas)
      } catch {
        if (vigente) setAviso('No se pudo conectar con el backend.')
      } finally {
        if (vigente) setCargando(false)
      }
    })()

    void (async () => {
      try {
        const actual = await sesionesApi.actual()
        if (!vigente) return
        setSesion(actual)
        sesionAutenticada.current = true
        void recargarLapidasConSesion()
      } catch {
        // Sin sesión: es un estado válido, no un error.
      }
    })()

    // El ranking de asesinos se carga aparte: si falla, el cementerio igual
    // se muestra y la sección avisa su propio error.
    void (async () => {
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

  async function recargarLapidasConSesion() {
    const solicitud = ++solicitudLapidas.current
    try {
      const lapidasCargadas = await lapidasApi.findAll()
      if (solicitud === solicitudLapidas.current) setLapidas(lapidasCargadas)
    } catch {
      if (solicitud === solicitudLapidas.current) {
        setAviso('No se pudo actualizar el estado de las coronas.')
      }
    }
  }

  /**
   * Abrir o cerrar una pantalla de autenticación limpia el aviso (E002): el
   * error de la sesión anterior no tiene por qué seguir en pantalla.
   */
  function abrirAuth(destino: VistaAuth | null) {
    setAviso('')
    setVistaAuth(destino)
  }

  async function ingresar(credenciales: Credenciales) {
    const actual = await sesionesApi.iniciar(credenciales)
    sesionAutenticada.current = true
    setSesion(actual)
    void recargarLapidasConSesion()
    abrirAuth(null)
    navegar(rutaDeVista('inicio'))
  }

  /**
   * El backend registra y deja la cookie puesta: entra logueado, igual que el
   * login. La navegación NO va acá: `RegistroPage` muestra el código de
   * recuperación y espera a que el usuario confirme que lo guardó, porque es la
   * única vez que lo va a ver.
   */
  async function registrar(credenciales: Credenciales) {
    const { sesion: creada, codigoRecuperacion } = await sesionesApi.registrar(credenciales)
    sesionAutenticada.current = true
    setSesion(creada)
    void recargarLapidasConSesion()
    return codigoRecuperacion
  }

  /** Confirmado el código, recién ahí se cierra el registro y se entra. */
  function continuarRegistro() {
    abrirAuth(null)
    navegar(rutaDeVista('inicio'))
  }

  /**
   * Recuperación sin sesión. El backend cierra todas las sesiones del usuario
   * al cambiar la contraseña, así que la copia local también se descarta: dejar
   * `sesion` con una cookie que ya no vale mostraría un perfil que no responde.
   */
  async function recuperar(datos: RecuperarPassword) {
    const { mensaje } = await sesionesApi.recuperar(datos)
    sesionAutenticada.current = false
    solicitudLapidas.current += 1
    setSesion(null)
    setLapidas((items) => items.map((item) => ({ ...item, coronadaPorMi: false })))
    return mensaje
  }

  async function cerrarSesion() {
    await sesionesApi.cerrar()
    sesionAutenticada.current = false
    solicitudLapidas.current += 1
    setSesion(null)
    setLapidas((items) => items.map((item) => ({ ...item, coronadaPorMi: false })))
    abrirAuth(null)
    navegar(rutaDeVista('inicio'))
  }

  async function publicar(input: CreateGraveInput, foto?: File) {
    // Un aviso viejo no debe sobrevivir a una publicación nueva (E002). Si la
    // foto falla, más abajo se vuelve a setear y ese sí tiene que quedar.
    setAviso('')
    const creada = await lapidasApi.create(input)
    setLapidas((items) => [creada, ...items])

    // La foto va en un segundo paso porque su endpoint cuelga del id que
    // devuelve el create. Si falla, la lápida ya está publicada: se avisa y se
    // sigue, en vez de dejar la publicación a medias sin explicación.
    if (foto) {
      try {
        const conFoto = await lapidasApi.subirFoto(creada.id, foto)
        setLapidas((items) => items.map((item) => (item.id === conFoto.id ? conFoto : item)))
      } catch (fallo) {
        setAviso(
          fallo instanceof ApiError
            ? `La lápida se publicó, pero la foto no: ${fallo.message}`
            : 'La lápida se publicó, pero la foto no se pudo subir.',
        )
      }
    }

    navegar(rutaDeVista('inicio'))
  }

  /**
   * Vuelve a pedir el cementerio (E003). Sin polling ni SSE, esta es la forma
   * de ver lo que publicó otra sesión sin recargar la página entera: la lista
   * local solo conoce lo que este navegador publicó o borró.
   */
  async function refrescarLapidas() {
    setActualizando(true)

    // Las dos lecturas son independientes: el cementerio no necesita el
    // ranking ni al revés. Van juntas (D002) y `allSettled` deja que un fallo
    // del ranking no cancele el cementerio, que es el que el usuario pidió.
    const [cementerio, ranking] = await Promise.allSettled([
      lapidasApi.findAll(),
      lapidasApi.asesinos(),
    ])

    if (cementerio.status === 'fulfilled') {
      setLapidas(cementerio.value)
      setAviso('')
    } else {
      setAviso(
        cementerio.reason instanceof ApiError
          ? cementerio.reason.message
          : 'No se pudo actualizar el cementerio.',
      )
    }

    // Best-effort: si falla, el cementerio ya está actualizado y el aviso del
    // ranking se muestra en su propia sección, no como error de la recarga.
    if (ranking.status === 'fulfilled') {
      setAsesinos(ranking.value)
      setErrorAsesinos('')
    }

    setActualizando(false)
  }

  async function darCorona(lapida: Grave) {
    if (sesion && lapida.duenio?.username === sesion.username) {
      setAviso('No podés coronarte a vos mismo')
      return
    }
    try {
      // Toggle: si ya le di corona, volver a tocar la quita. El backend es
      // idempotente en los dos sentidos, así que el estado local no puede
      // desincronizarse por tocar dos veces.
      const actualizada = lapida.coronadaPorMi
        ? await lapidasApi.quitarCorona(lapida.id)
        : await lapidasApi.giveCorona(lapida.id)
      setLapidas((items) => items.map((item) => (item.id === actualizada.id ? actualizada : item)))
      // `seleccionada` se deriva de `lapidas` por `detalleId`, no hay estado local aparte
      setAviso('')
    } catch (fallo) {
      setAviso(fallo instanceof ApiError ? fallo.message : 'No se pudo actualizar la corona.')
    }
  }

  async function revivirLapida(lapida: Grave) {
    try {
      const actualizada = await lapidasApi.revivir(lapida.id)
      setLapidas((items) => items.map((item) => (item.id === actualizada.id ? actualizada : item)))
      setAviso('')
    } catch (fallo) {
      setAviso(fallo instanceof ApiError ? fallo.message : 'No se pudo revivir la lápida.')
    }
  }

  /**
   * Primer paso del borrado (E004): abrir el modal. No se llama a la API acá.
   * La firma sigue siendo `Promise<void>` para no tocar los tres llamadores.
   */
  async function pedirConfirmacionBorrado(lapida: Grave) {
    setLapidaAConfirmar(lapida)
  }

  /** Segundo paso: el usuario confirmó en el modal. */
  async function confirmarBorrado() {
    const lapida = lapidaAConfirmar
    if (!lapida) return
    setLapidaAConfirmar(null)
    try {
      await lapidasApi.remove(lapida.id)
      setLapidas((items) => items.filter((item) => item.id !== lapida.id))
      // Si se borró la que estaba abierta, la URL apunta a algo que ya no
      // existe: se vuelve al inicio para no quedar en un detalle fantasma.
      if (detalleId === lapida.id) navegar(rutaDeVista('inicio'))
    } catch (fallo) {
      setAviso(fallo instanceof ApiError ? fallo.message : 'No se pudo borrar la lápida.')
      return
    }

    // Borrar cambia el ranking de asesinos: se recarga en vez de recalcularlo
    // en cliente, que daría una cuenta distinta a la del backend. Va aparte a
    // propósito: si esta recarga falla, la lápida YA se borró y decir "no se
    // pudo borrar" sería mentir.
    try {
      const ranking = await lapidasApi.asesinos()
      setAsesinos(ranking)
    } catch {
      setAviso('La lápida se borró, pero no se pudo actualizar el ranking de asesinos.')
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
  const irAVista = useCallback(
    (destino: Vista) => {
      // Cambiar de pestaña descarta los errores de la anterior (E002); el aviso
      // global no tiene por qué seguir en una pantalla donde ya no aplica.
      setAviso('')
      navegar(rutaDeVista(destino))
    },
    [navegar],
  )
  /** Abrir una lápida escribe la URL del detalle. */
  const abrirDetalle = useCallback(
    (lapida: Grave) => {
      setAviso('')
      navegar(rutaDeDetalle(lapida.id))
    },
    [navegar],
  )

  /**
   * Navegación de los links con URL real (sidebar, tarjetas de perfiles).
   *
   * Va por el mismo `navegar` del router y limpia el aviso de la pantalla
   * anterior, igual que el menú.
   */
  const navegarInterno = useCallback(
    (destino: string) => {
      setAviso('')
      navegar(destino)
    },
    [navegar],
  )

  if (vistaAuth) {
    return (
      <div className="pantalla">
        <Nav activa={null} items={[]} onNavegar={() => abrirAuth(null)} />
        {vistaAuth === 'login' && <LoginPage onIngresar={ingresar} onNavegar={abrirAuth} />}
        {vistaAuth === 'registro' && (
          <RegistroPage
            onRegistrar={registrar}
            onContinuar={continuarRegistro}
            onNavegar={abrirAuth}
          />
        )}
        {vistaAuth === 'recuperar' && (
          <RecuperarPage onRecuperar={recuperar} onNavegar={abrirAuth} />
        )}
      </div>
    )
  }

  return (
    <div className={`pantalla${seleccionada ? ' pantalla--detalle' : ''}`}>
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
            <button className="nav__item" onClick={() => abrirAuth('login')}>
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
          onBorrar={pedirConfirmacionBorrado}
          onRevivir={revivirLapida}
          onVolver={() => irAVista('inicio')}
        />
      ) : (
        <>
          {vista === 'inicio' && (
            <InicioPage
              lapidas={lapidas}
              categorias={categorias}
              asesinos={asesinos}
              sesion={sesion}
              errorAsesinos={errorAsesinos}
              onAbrir={abrirDetalle}
              onCorona={(l) => void darCorona(l)}
              onPublicar={() => irAVista('publicar')}
              onActualizar={() => void refrescarLapidas()}
              actualizando={actualizando}
              onNavegar={navegarInterno}
            />
          )}
          {vista === 'ranking' && (
            <RankingPage
              lapidas={lapidas}
              categorias={categorias}
              asesinos={asesinos}
              errorAsesinos={errorAsesinos}
              onNavegar={navegarInterno}
            />
          )}
          {vista === 'publicar' && (
            <PublicarPage
              categorias={categorias}
              sesionId={sesion?.id ?? null}
              onPublicar={publicar}
            />
          )}
          {vista === 'perfil' && (
            <PerfilPage
              sesion={sesion}
              lapidas={lapidas}
              categorias={categorias}
              asesinos={asesinos}
              onAbrir={abrirDetalle}
              onCorona={darCorona}
              onPublicar={() => irAVista('publicar')}
              onBorrar={pedirConfirmacionBorrado}
              onIniciarSesion={() => abrirAuth('login')}
              onActualizarDescripcion={async (descripcion) => {
                if (!sesion) return
                const actualizado = await usuariosApi.actualizarDescripcion(sesion.id, descripcion)
                setSesion((s) => (s ? { ...s, descripcion: actualizado.descripcion } : s))
              }}
              onEmitirCodigoRecuperacion={async (passwordActual) => {
                // El perfil propio exige la contraseña; la sección no existe
                // sin sesión, así que `sesion` acá siempre está presente.
                if (!sesion) return ''
                const { codigoRecuperacion } = await usuariosApi.emitirCodigoRecuperacion(
                  sesion.id,
                  passwordActual,
                )
                return codigoRecuperacion
              }}
            />
          )}
          {vista === 'perfiles' && (
            <PerfilesPage
              sesion={sesion}
              lapidas={lapidas}
              categorias={categorias}
              asesinos={asesinos}
              onAbrir={abrirDetalle}
              onPublicar={() => irAVista('publicar')}
              onBorrar={pedirConfirmacionBorrado}
              onCorona={darCorona}
              onIrAMiPerfil={() => irAVista('perfil')}
              username={usernamePerfil}
              onNavegar={navegarInterno}
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

      {lapidaAConfirmar && (
        <Confirmacion
          titulo="BORRAR LÁPIDA"
          etiquetaConfirmar="BORRAR"
          onConfirmar={() => void confirmarBorrado()}
          onCancelar={() => setLapidaAConfirmar(null)}
        >
          ¿Borrar la lápida de «{lapidaAConfirmar.nombrePlanta}»? Esta acción no se puede
          deshacer.
        </Confirmacion>
      )}
    </div>
  )
}
