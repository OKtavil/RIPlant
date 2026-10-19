import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../../shared/api/client'
import { Aviso } from '../../../shared/ui/Aviso'
import { Boton, EnlaceBoton } from '../../../shared/ui/Boton'
import { CampoTexto } from '../../../shared/ui/Campo'
import type { Credenciales, VistaAuth } from '../model/sesion'
import { AlternarMostrar, AuthTarjeta } from './AuthTarjeta'

type Props = {
  onIngresar: (credenciales: Credenciales) => Promise<void>
  onNavegar: (vista: VistaAuth) => void
}

export function LoginPage({ onIngresar, onNavegar }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setError('')
    try {
      await onIngresar({ username: username.trim(), password })
    } catch (fallo) {
      setError(fallo instanceof ApiError ? fallo.message : 'No se pudo iniciar sesión.')
      setEnviando(false)
    }
  }

  return (
    <AuthTarjeta
      titulo="Vuelve a tu jardín"
      subtitulo="Inicia sesión para cuidar tus recuerdos."
      pie={
        <>
          <EnlaceBoton tono="rojo" onClick={() => onNavegar('recuperar')}>
            ¿OLVIDASTE TU CONTRASEÑA?
          </EnlaceBoton>
          <br />
          ¿AÚN NO TIENES CUENTA?{' '}
          <EnlaceBoton onClick={() => onNavegar('registro')}>CREAR UNA CUENTA</EnlaceBoton>
        </>
      }
    >
      <form className="auth__form" onSubmit={manejarEnvio}>
        <CampoTexto
          id="login-identidad"
          etiqueta="Nombre de usuario"
          placeholder="@tu_usuario"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          ayuda="El prototipo rotula este campo “CORREO ELECTRÓNICO”, pero la API autentica por usuario."
        />

        <CampoTexto
          id="login-password"
          etiqueta="CONTRASEÑA"
          type={verPassword ? 'text' : 'password'}
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          accion={<AlternarMostrar visible={verPassword} onAlternar={() => setVerPassword((v) => !v)} />}
        />

        {error && <Aviso tono="error">{error}</Aviso>}

        <Boton type="submit" bloque disabled={enviando}>
          {enviando ? 'ENTRANDO…' : 'ENTRAR'}
        </Boton>
      </form>
    </AuthTarjeta>
  )
}
