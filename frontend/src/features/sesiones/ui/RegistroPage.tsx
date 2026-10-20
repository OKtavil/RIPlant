import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../../shared/api/client'
import { Aviso } from '../../../shared/ui/Aviso'
import { Boton, EnlaceBoton } from '../../../shared/ui/Boton'
import { CampoTexto } from '../../../shared/ui/Campo'
import type { Credenciales, VistaAuth } from '../model/sesion'
import { AlternarMostrar, AuthTarjeta } from './AuthTarjeta'

type Props = {
  onRegistrar: (credenciales: Credenciales) => Promise<void>
  onNavegar: (vista: VistaAuth) => void
}

/**
 * Crear cuenta ya tiene endpoint (`POST /usuarios`, con auto-login). El correo
 * queda deshabilitado a propósito: el backend todavía no guarda email y el
 * registro no lo pide, así que no se simula un campo que no llega a ningún lado.
 */

const MINIMO_PASSWORD = 8

export function RegistroPage({ onRegistrar, onNavegar }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault()
    setError('')

    if (password.length < MINIMO_PASSWORD) {
      setError(`La contraseña necesita al menos ${MINIMO_PASSWORD} caracteres.`)
      return
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setEnviando(true)
    try {
      await onRegistrar({ username: username.trim(), password })
    } catch (fallo) {
      setError(fallo instanceof ApiError ? fallo.message : 'No se pudo crear la cuenta.')
      setEnviando(false)
    }
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
      <form className="auth__form" onSubmit={manejarEnvio}>
        <CampoTexto
          id="registro-usuario"
          etiqueta="NOMBRE DE USUARIO"
          placeholder="@tu_usuario"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <CampoTexto
          id="registro-correo"
          etiqueta="CORREO ELECTRÓNICO"
          type="email"
          placeholder="tu@correo.com"
          disabled
          ayuda="El registro todavía no pide correo; se habilita cuando exista la recuperación de contraseña."
        />
        <CampoTexto
          id="registro-password"
          etiqueta="CONTRASEÑA"
          type={verPassword ? 'text' : 'password'}
          autoComplete="new-password"
          required
          minLength={MINIMO_PASSWORD}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          accion={<AlternarMostrar visible={verPassword} onAlternar={() => setVerPassword((v) => !v)} />}
        />
        <CampoTexto
          id="registro-confirmar"
          etiqueta="CONFIRMAR CONTRASEÑA"
          type="password"
          autoComplete="new-password"
          required
          minLength={MINIMO_PASSWORD}
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
        />

        {error && <Aviso tono="error">{error}</Aviso>}

        <Boton type="submit" bloque disabled={enviando}>
          {enviando ? 'CREANDO…' : 'CREAR CUENTA'}
        </Boton>
      </form>
    </AuthTarjeta>
  )
}
