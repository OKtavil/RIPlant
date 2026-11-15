import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../../shared/api/client'
import { Aviso } from '../../../shared/ui/Aviso'
import { Boton, EnlaceBoton } from '../../../shared/ui/Boton'
import { CampoTexto } from '../../../shared/ui/Campo'
import { useFormErrorPulse } from '../../../shared/ui/useFormErrorPulse'
import type { Credenciales, VistaAuth } from '../model/sesion'
import { AlternarMostrar, AuthTarjeta } from './AuthTarjeta'

type Props = {
  /**
   * Crea la cuenta y devuelve el código de recuperación en claro. Es la única
   * vez que ese código existe: en la base solo queda su hash.
   */
  onRegistrar: (credenciales: Credenciales) => Promise<string>
  /** Cierra la pantalla de autenticación y entra al cementerio. */
  onContinuar: () => void
  onNavegar: (vista: VistaAuth) => void
}

/**
 * Crear cuenta ya tiene endpoint (`POST /usuarios`, con auto-login). El correo
 * no se muestra: el backend no lo guarda ni lo pide en el registro.
 *
 * Después del alta **no se navega solo**: se muestra el código de recuperación
 * una única vez y se espera a que el usuario confirme que lo guardó. Sin email
 * ni SMS, ese código es su única forma de volver a entrar si olvida la
 * contraseña, y perdérselo por un cambio automático de pantalla sería definitivo.
 */

const MINIMO_PASSWORD = 8
/** Espejo de los límites del backend: el username vive en 50 y bcrypt en 72. */
const MAXIMO_USUARIO = 50
const MAXIMO_PASSWORD = 72

export function RegistroPage({ onRegistrar, onContinuar, onNavegar }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})
  /** Código recién emitido. Cuando existe, se reemplaza el formulario. */
  const [codigoRecuperacion, setCodigoRecuperacion] = useState('')
  const { errorPulse, onSubmitCapture } = useFormErrorPulse()

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault()
    const nuevosErrores: Record<string, string> = {}

    if (!username.trim()) nuevosErrores.username = 'El nombre de usuario es obligatorio.'
    else if (username.trim().length > MAXIMO_USUARIO) {
      nuevosErrores.username = `El nombre de usuario no puede superar los ${MAXIMO_USUARIO} caracteres.`
    }
    if (password.length < MINIMO_PASSWORD) {
      nuevosErrores.password = `La contraseña necesita al menos ${MINIMO_PASSWORD} caracteres.`
    } else if (password.length > MAXIMO_PASSWORD) {
      nuevosErrores.password = `La contraseña no puede superar los ${MAXIMO_PASSWORD} caracteres.`
    }
    if (password !== confirmar) {
      nuevosErrores.confirmar = 'Las contraseñas no coinciden.'
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores)
      return
    }

    setErrores({})
    setEnviando(true)
    try {
      const codigo = await onRegistrar({ username: username.trim(), password })
      setCodigoRecuperacion(codigo)
    } catch (fallo) {
      if (fallo instanceof ApiError) {
        setErrores({ general: fallo.message })
      } else {
        setErrores({ general: 'No se pudo crear la cuenta.' })
      }
      setEnviando(false)
    }
  }

  if (codigoRecuperacion) {
    return (
      <AuthTarjeta
        titulo="Guardá este código"
        subtitulo="Es tu llave para volver si olvidás la contraseña."
      >
        <p className="auth__contexto">
          Este es tu código de recuperación. <strong>No se vuelve a mostrar</strong> y no lo
          enviamos por correo: anotalo en un lugar seguro.
        </p>
        <p style={{ fontFamily: 'var(--fuente-pixel)', fontSize: 16, letterSpacing: 1, wordBreak: 'break-all', margin: '8px 0' }}>{codigoRecuperacion}</p>
        <p className="auth__contexto">
          Si lo perdés, podés generar uno nuevo desde tu perfil con tu contraseña actual; el
          anterior dejará de servir.
        </p>
        <Boton type="button" bloque onClick={onContinuar}>
          ENTRAR AL CEMENTERIO
        </Boton>
      </AuthTarjeta>
    )
  }

  return (
    <AuthTarjeta
      titulo="Únete al jardín"
      subtitulo="Abre un espacio para tus homenajes."
      pie={
        <>
          YA TENGO UNA CUENTA ·{' '}
          <EnlaceBoton onClick={() => onNavegar('login')}>INICIAR SESIÓN</EnlaceBoton>
        </>
      }
    >
      <form
        className="auth__form"
        data-error-pulse={errorPulse}
        onSubmitCapture={onSubmitCapture}
        onSubmit={manejarEnvio}
        noValidate
      >
        <CampoTexto
          id="registro-usuario"
          etiqueta="NOMBRE DE USUARIO"
          placeholder="@tu_usuario"
          autoComplete="username"
          required
          maxLength={MAXIMO_USUARIO}
          value={username}
          error={errores.username}
          onChange={(e) => {
            setUsername(e.target.value)
            setErrores((previos) => ({ ...previos, username: '' }))
          }}
        />
        <CampoTexto
          id="registro-password"
          etiqueta="CONTRASEÑA"
          type={verPassword ? 'text' : 'password'}
          autoComplete="new-password"
          required
          minLength={MINIMO_PASSWORD}
          maxLength={MAXIMO_PASSWORD}
          value={password}
          error={errores.password}
          onChange={(e) => {
            setPassword(e.target.value)
            setErrores((previos) => ({ ...previos, password: '', confirmar: '' }))
          }}
          accion={<AlternarMostrar visible={verPassword} onAlternar={() => setVerPassword((v) => !v)} />}
        />
        <CampoTexto
          id="registro-confirmar"
          etiqueta="CONFIRMAR CONTRASEÑA"
          type="password"
          autoComplete="new-password"
          required
          minLength={MINIMO_PASSWORD}
          maxLength={MAXIMO_PASSWORD}
          value={confirmar}
          error={errores.confirmar}
          onChange={(e) => {
            setConfirmar(e.target.value)
            setErrores((previos) => ({ ...previos, confirmar: '' }))
          }}
        />

        {errores.general && <Aviso tono="error">{errores.general}</Aviso>}

        <Boton type="submit" bloque disabled={enviando}>
          {enviando ? 'CREANDO…' : 'CREAR CUENTA'}
        </Boton>
      </form>
    </AuthTarjeta>
  )
}
