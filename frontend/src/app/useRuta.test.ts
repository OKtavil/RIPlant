import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRuta } from './useRuta'

describe('useRuta', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('arranca leyendo la URL actual', () => {
    window.history.replaceState(null, '', '/ranking')

    const { result } = renderHook(() => useRuta())

    expect(result.current.ruta).toEqual({ tipo: 'vista', vista: 'ranking' })
  })

  it('navegar cambia la ruta y la URL', () => {
    const { result } = renderHook(() => useRuta())

    act(() => result.current.navegar('/perfil'))

    expect(result.current.ruta).toEqual({ tipo: 'vista', vista: 'perfil' })
    expect(window.location.pathname).toBe('/perfil')
  })

  it('relee la URL cuando el navegador dispara popstate', () => {
    // El caso que se rompe en silencio: sin escuchar `popstate`, el Atrás del
    // navegador cambia la pantalla esperada pero la vista queda congelada.
    //
    // jsdom no navega de verdad (su `history.back()` deja la URL intacta), así
    // que se reproduce lo que hace el navegador real: cambiar la URL y avisar.
    const { result } = renderHook(() => useRuta())
    act(() => result.current.navegar('/ranking'))

    act(() => {
      window.history.replaceState(null, '', '/')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    expect(result.current.ruta).toEqual({ tipo: 'vista', vista: 'inicio' })
  })

  it('no deja el listener colgado al desmontar', () => {
    const quitar = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useRuta())

    unmount()

    expect(quitar).toHaveBeenCalledWith('popstate', expect.any(Function))
  })

  it('navegar a la misma ruta no rompe', () => {
    window.history.replaceState(null, '', '/publicar')
    const { result } = renderHook(() => useRuta())

    act(() => result.current.navegar('/publicar'))

    expect(result.current.ruta).toEqual({ tipo: 'vista', vista: 'publicar' })
  })
})
