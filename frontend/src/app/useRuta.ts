import { useCallback, useEffect, useState } from 'react'
import { parsearRuta, type Ruta } from './ruta'

/**
 * Mantiene la URL y la pantalla en sincronía.
 *
 * Lee la ruta al montar y la vuelve a leer cuando el usuario usa Atrás o
 * Adelante del navegador (`popstate`). Navegar escribe en la URL con
 * `pushState`, así que cada pantalla queda con una dirección propia y recargar
 * la página mantiene al usuario donde estaba.
 */
export function useRuta() {
  const [ruta, setRuta] = useState<Ruta>(() =>
    parsearRuta(window.location.pathname),
  )

  useEffect(() => {
    const alVolver = () => setRuta(parsearRuta(window.location.pathname))
    window.addEventListener('popstate', alVolver)
    return () => window.removeEventListener('popstate', alVolver)
  }, [])

  const navegar = useCallback((destino: string) => {
    if (window.location.pathname === destino) return
    window.history.pushState(null, '', destino)
    setRuta(parsearRuta(destino))
  }, [])

  return { ruta, navegar }
}
