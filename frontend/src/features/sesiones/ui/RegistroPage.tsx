import { useState } from 'react'
import type { FormEvent } from 'react'
import { AvisoNoDisponible } from '../../../shared/ui/Aviso'
import { Boton, EnlaceBoton } from '../../../shared/ui/Boton'
import { CampoTexto } from '../../../shared/ui/Campo'
import type { VistaAuth } from '../model/sesion'
import { AlternarMostrar, AuthTarjeta } from './AuthTarjeta'

/**
 * Crear cuenta no tiene endpoint en el backend: la UI es fiel al prototipo pero
 * queda deshabilitada, sin simular un registro que en realidad no ocurre.
 */

export function RegistroPage({ onNavegar }: { onNavegar: (vista: VistaAuth) => void }) {
  const [verPassword, setVerPassword] = useState(false)

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
      <form className="auth__form" onSubmit={(e: FormEvent) => e.preventDefault()}>
        <CampoTexto id="registro-usuario" etiqueta="NOMBRE DE USUARIO" placeholder="@tu_usuario" disabled />
        <CampoTexto id="registro-correo" etiqueta="CORREO ELECTRÓNICO" type="email" placeholder="tu@correo.com" disabled />
        <CampoTexto
          id="registro-password"
          etiqueta="CONTRASEÑA"
          type={verPassword ? 'text' : 'password'}
          disabled
          accion={<AlternarMostrar visible={verPassword} onAlternar={() => setVerPassword((v) => !v)} />}
        />
        <CampoTexto id="registro-confirmar" etiqueta="CONFIRMAR CONTRASEÑA" type="password" disabled />

        <AvisoNoDisponible>El registro todavía no tiene endpoint en el backend.</AvisoNoDisponible>

        <Boton type="submit" bloque disabled>
          CREAR CUENTA
        </Boton>
      </form>
    </AuthTarjeta>
  )
}
