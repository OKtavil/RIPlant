import type { FormEvent } from 'react'
import { AvisoNoDisponible } from '../../../shared/ui/Aviso'
import { Boton, EnlaceBoton } from '../../../shared/ui/Boton'
import { CampoTexto } from '../../../shared/ui/Campo'
import type { VistaAuth } from '../model/sesion'
import { AuthTarjeta } from './AuthTarjeta'

/** Recuperar contraseña no tiene endpoint: solo UI fiel, deshabilitada. */

export function RecuperarPage({ onNavegar }: { onNavegar: (vista: VistaAuth) => void }) {
  return (
    <AuthTarjeta
      titulo="Recupera tu acceso"
      subtitulo="Te ayudaremos a volver a tu jardín."
      pie={<EnlaceBoton onClick={() => onNavegar('login')}>VOLVER A INICIAR SESIÓN</EnlaceBoton>}
    >
      <form className="auth__form" onSubmit={(e: FormEvent) => e.preventDefault()}>
        <CampoTexto id="recuperar-correo" etiqueta="CORREO ELECTRÓNICO" type="email" placeholder="tu@correo.com" disabled />

        <AvisoNoDisponible>
          La recuperación de contraseña todavía no tiene endpoint en el backend.
        </AvisoNoDisponible>

        <Boton type="submit" bloque disabled>
          ENVIAR ENLACE
        </Boton>
      </form>
    </AuthTarjeta>
  )
}
