import { useState } from 'react'
import type { FormEventHandler } from 'react'

/** Alterna el selector CSS para reiniciar la animación si persiste el error al reenviar. */
export function useFormErrorPulse(): {
  errorPulse: 'a' | 'b'
  onSubmitCapture: FormEventHandler<HTMLFormElement>
} {
  const [errorPulse, setErrorPulse] = useState<'a' | 'b'>('a')
  const onSubmitCapture: FormEventHandler<HTMLFormElement> = () => {
    setErrorPulse((actual) => (actual === 'a' ? 'b' : 'a'))
  }

  return { errorPulse, onSubmitCapture }
}
