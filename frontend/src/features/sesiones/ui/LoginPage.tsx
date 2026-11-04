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
  const [errores, setErrores] = useState<Record<string, string>>({})

  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault()
    const nuevosErrores: Record<string, string> = {}
    if (!username.trim()) nuevosErrores.username = 'El nombre de usuario es obligatorio.'
    if (!password) nuevosErrores.password = 'La contraseña es obligatoria.'
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores)
      return
    }
    setEnviando(true)
    setErrores({})
    try {
      await onIngresar({ username: username.trim(), password })
    } catch (fallo) {
      if (fallo instanceof ApiError) {
        setErrores({ general: fallo.message })
      } else {
        setErrores({ general: 'No se pudo iniciar sesión.' })
      }
      setEnviando(false)
    }
  }

  return (
    <AuthTarjeta
      titulo="Vuelve a tu jardín"
      subtitulo="Inicia sesión para cuidar tus recuerdos."
      pie={
        <>
          ¿AÚN NO TIENES CUENTA?{' '}
          <EnlaceBoton onClick={() => onNavegar('registro')}>CREAR UNA CUENTA</EnlaceBoton>
        </>
      }
    >
      <form className="auth__form" onSubmit={manejarEnvio} noValidate>
        <CampoTexto
          id="login-identidad"
          etiqueta="Nombre de usuario"
          placeholder="@tu_usuario"
          autoComplete="username"
          required
          value={username}
          error={errores.username}
          onChange={(e) => {
            setUsername(e.target.value)
            setErrores((err) => ({ ...err, username: '' }))
          }}
        />

        <CampoTexto
          id="login-password"
          etiqueta="CONTRASEÑA"
          type={verPassword ? 'text' : 'password'}
          autoComplete="current-password"
          required
          value={password}
          error={errores.password}
          onChange={(e) => {
            setPassword(e.target.value)
            setErrores((err) => ({ ...err, password: '' }))
          }}
          accion={<AlternarMostrar visible={verPassword} onAlternar={() => setVerPassword((v) => !v)} />}
        />

        {errores.general && <Aviso tono="error">{errores.general}</Aviso>}

        <Boton type="submit" bloque disabled={enviando}>
          {enviando ? 'ENTRANDO…' : 'ENTRAR'}
        </Boton>
      </form>
    </AuthTarjeta>
  )
}
