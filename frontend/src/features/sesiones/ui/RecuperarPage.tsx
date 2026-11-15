import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../../shared/api/client'
import { Aviso } from '../../../shared/ui/Aviso'
import { Boton, EnlaceBoton } from '../../../shared/ui/Boton'
import { CampoTexto } from '../../../shared/ui/Campo'
import { useFormErrorPulse } from '../../../shared/ui/useFormErrorPulse'
import type { RecuperarPassword, VistaAuth } from '../model/sesion'
import { AlternarMostrar, AuthTarjeta } from './AuthTarjeta'

type Props = {
  /** Devuelve el mensaje de confirmación del backend para mostrarlo tal cual. */
  onRecuperar: (datos: RecuperarPassword) => Promise<string>
  onNavegar: (vista: VistaAuth) => void
}

/**
 * Recuperación en un paso: usuario + código de un solo uso + contraseña nueva.
 *
 * No hay email ni enlace mágico: el código se muestra una sola vez al
 * registrarse (o cuando se regenera desde el perfil) y es lo único que prueba
 * que la cuenta es tuya. Por eso el aviso de éxito insiste en que se guarde.
 */

const MINIMO_PASSWORD = 8
/** Espejo de los límites del backend: username 50 y bcrypt 72. */
const MAXIMO_USUARIO = 50
const MAXIMO_PASSWORD = 72
/** El backend acepta hasta 64 por los separadores que alguien escriba. */
const MAXIMO_CODIGO = 64

export function RecuperarPage({ onRecuperar, onNavegar }: Props) {
  const [username, setUsername] = useState('')
  const [codigo, setCodigo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})
  /** Mensaje de éxito: cuando existe, el formulario ya no se muestra. */
  const [exito, setExito] = useState('')
  const { errorPulse, onSubmitCapture } = useFormErrorPulse()

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault()
    const nuevosErrores: Record<string, string> = {}
    if (!username.trim()) {
      nuevosErrores.username = 'El nombre de usuario es obligatorio.'
    }
    if (!codigo.trim()) {
      nuevosErrores.codigo = 'El código de recuperación es obligatorio.'
    }
    if (password.length < MINIMO_PASSWORD) {
      nuevosErrores.password = `La contraseña debe tener al menos ${MINIMO_PASSWORD} caracteres.`
    } else if (password.length > MAXIMO_PASSWORD) {
      nuevosErrores.password = `La contraseña debe tener como máximo ${MAXIMO_PASSWORD} caracteres.`
    }
    if (password !== confirmar) {
      nuevosErrores.confirmar = 'Las contraseñas no coinciden.'
    }
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores)
      return
    }

    setEnviando(true)
    setErrores({})
    try {
      const mensaje = await onRecuperar({
        username: username.trim(),
        codigo: codigo.trim(),
        password,
      })
      setExito(mensaje)
    } catch (fallo) {
      setErrores({
        general:
          fallo instanceof ApiError ? fallo.message : 'No se pudo recuperar la contraseña.',
      })
    } finally {
      // Siempre se rehabilita: si falló, el usuario tiene que poder corregir y
      // reintentar; si salió bien, el botón ya no está en pantalla.
      setEnviando(false)
    }
  }

  if (exito) {
    return (
      <AuthTarjeta
        titulo="Contraseña actualizada"
        subtitulo="Ya podés volver a tu jardín."
        pie={<EnlaceBoton onClick={() => onNavegar('login')}>VOLVER A INICIAR SESIÓN</EnlaceBoton>}
      >
        <Aviso tono="info">{exito}</Aviso>
      </AuthTarjeta>
    )
  }

  return (
    <AuthTarjeta
      titulo="Recupera tu acceso"
      subtitulo="Usá el código que te dimos al crear la cuenta."
      pie={<EnlaceBoton onClick={() => onNavegar('login')}>VOLVER A INICIAR SESIÓN</EnlaceBoton>}
    >
      <form
        className="auth__form"
        data-error-pulse={errorPulse}
        onSubmitCapture={onSubmitCapture}
        onSubmit={manejarEnvio}
        noValidate
      >
        <CampoTexto
          id="recuperar-usuario"
          etiqueta="Nombre de usuario"
          placeholder="@tu_usuario"
          autoComplete="username"
          required
          maxLength={MAXIMO_USUARIO}
          value={username}
          error={errores.username}
          onChange={(e) => {
            setUsername(e.target.value)
            setErrores((err) => ({ ...err, username: '' }))
          }}
        />

        <CampoTexto
          id="recuperar-codigo"
          etiqueta="CÓDIGO DE RECUPERACIÓN"
          placeholder="ABCD-EFGH-IJKL-MNOP"
          autoComplete="one-time-code"
          required
          maxLength={MAXIMO_CODIGO}
          value={codigo}
          error={errores.codigo}
          ayuda="El código de 16 caracteres que viste al registrarte. No distingue mayúsculas ni guiones."
          onChange={(e) => {
            setCodigo(e.target.value)
            setErrores((err) => ({ ...err, codigo: '' }))
          }}
        />

        <CampoTexto
          id="recuperar-password"
          etiqueta="NUEVA CONTRASEÑA"
          type={verPassword ? 'text' : 'password'}
          autoComplete="new-password"
          required
          maxLength={MAXIMO_PASSWORD}
          value={password}
          error={errores.password}
          onChange={(e) => {
            setPassword(e.target.value)
            setErrores((err) => ({ ...err, password: '' }))
          }}
          accion={<AlternarMostrar visible={verPassword} onAlternar={() => setVerPassword((v) => !v)} />}
        />

        <CampoTexto
          id="recuperar-confirmar"
          etiqueta="REPITE LA CONTRASEÑA"
          type={verPassword ? 'text' : 'password'}
          autoComplete="new-password"
          required
          maxLength={MAXIMO_PASSWORD}
          value={confirmar}
          error={errores.confirmar}
          onChange={(e) => {
            setConfirmar(e.target.value)
            setErrores((err) => ({ ...err, confirmar: '' }))
          }}
        />

        {errores.general && <Aviso tono="error">{errores.general}</Aviso>}

        <Boton type="submit" bloque disabled={enviando}>
          {enviando ? 'CAMBIANDO…' : 'CAMBIAR CONTRASEÑA'}
        </Boton>
      </form>
    </AuthTarjeta>
  )
}
