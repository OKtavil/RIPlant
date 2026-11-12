import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Category } from '../../categorias/model/categoria'
import type { Asesino, Grave } from '../model/lapida'
import { InicioPage } from './InicioPage'

function lapida(parcial: Partial<Grave> = {}): Grave {
  return {
    id: 1,
    nombrePlanta: 'Descanse en cactus',
    epitafio: 'Nunca supo lo que era el sol, pero tampoco lo que era el agua.',
    fechaFallecimiento: '2025-01-01',
    fechaPublicacion: '2025-01-02',
    autor: 'zombie',
    categoriaId: 1,
    causaMuerte: 'Poca luz',
    fotoUrl: '',
    coronasCount: 287,
    usuarioId: 'u1',
    ...parcial,
  }
}

const categorias: Category[] = [{ id: 1, nombre: 'Cactus' }]
const asesinos: Asesino[] = [{ username: 'zombie', muertes: 3 }]

function renderInicio(lapidas: Grave[] = [lapida()]) {
  return render(
    <InicioPage
      lapidas={lapidas}
      categorias={categorias}
      asesinos={asesinos}
      sesion={null}
      errorAsesinos=""
      onAbrir={vi.fn()}
      onCorona={vi.fn()}
      onPublicar={vi.fn()}
      onActualizar={vi.fn()}
      actualizando={false}
    />,
  )
}

describe('InicioPage — Salón del Honor (R001)', () => {
  it('no pinta el contador de coronas con el rojo de los asesinos', () => {
    const { container } = renderInicio()

    // El prototipo usa `#8B4513` para el contador. El rojo (`#C0392B`) está
    // reservado a "Asesinos seriales" y a los errores; usarlo acá hacía que el
    // Salón del Honor pareciera una advertencia.
    const valor = container.querySelector('.sidebar__valor')!
    expect(valor.className).not.toContain('sidebar__valor--rojo')
  })

  it('pinta la corona del Salón del Honor con el dorado de las tarjetas', () => {
    const { container } = renderInicio()

    // Misma corona que `GraveCard`: `#C9924F`. Antes se forzaba `#C0392B` por
    // prop, así que el icono no seguía a la clase que lo contiene.
    const corona = container.querySelector('.sidebar__valor svg')!
    expect(corona.getAttribute('stroke')).toBe('#C9924F')
  })

  it('muestra la corona y el contador juntos en la misma fila', () => {
    const { container } = renderInicio()

    const valor = container.querySelector('.sidebar__valor')!
    expect(valor.querySelector('svg')).toBeTruthy()
    expect(valor.textContent).toBe('287')
  })
})
