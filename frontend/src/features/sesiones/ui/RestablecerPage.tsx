import { useState } from 'react'
import type { FormEvent } from 'react'
import { AvisoNoDisponible } from '../../../shared/ui/Aviso'
import { Boton, EnlaceBoton } from '../../../shared/ui/Boton'
import { CampoTexto } from '../../../shared/ui/Campo'
import type { VistaAuth } from '../model/sesion'
import { AlternarMostrar, AuthTarjeta } from './AuthTarjeta'

/** Nueva contraseña no tiene endpoint: solo UI fiel, deshabilitada. */

export function RestablecerPage({ onNavegar }: { onNavegar: (vista: VistaAuth) => void }) {
  const [verPassword, setVerPassword] = useState(false)

  return (
    <AuthTarjeta
      titulo="Elige una nueva contraseña"
      subtitulo="Tu jardín te estaba esperando."
      pie={<EnlaceBoton onClick={() => onNavegar('login')}>VOLVER A INICIAR SESIÓN</EnlaceBoton>}
    >
      <form className="auth__form" onSubmit={(e: FormEvent) => e.preventDefault()}>
        <CampoTexto
          id="restablecer-password"
          etiqueta="NUEVA CONTRASEÑA"
          type={verPassword ? 'text' : 'password'}
          disabled
          accion={<AlternarMostrar visible={verPassword} onAlternar={() => setVerPassword((v) => !v)} />}
        />
        <CampoTexto id="restablecer-confirmar" etiqueta="CONFIRMAR CONTRASEÑA" type="password" disabled />

        <AvisoNoDisponible>
          El cambio de contraseña todavía no tiene endpoint en el backend.
        </AvisoNoDisponible>

        <Boton type="submit" bloque disabled>
          GUARDAR CONTRASEÑA
        </Boton>
      </form>
    </AuthTarjeta>
  )
}
