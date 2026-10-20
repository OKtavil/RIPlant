import { describe, expect, it } from 'vitest'
import { nombreDelDuenio, puedeBorrar, type Grave } from './lapida'

function lapida(parcial: Partial<Grave>): Grave {
  return {
    id: 1,
    nombrePlanta: 'Pepino',
    epitafio: 'Se fue',
    fechaFallecimiento: '2025-01-01',
    fechaPublicacion: '2025-01-02',
    autor: 'texto libre',
    categoriaId: 1,
    causaMuerte: 'Poca luz',
    fotoUrl: '',
    coronasCount: 0,
    usuarioId: 'u1',
    ...parcial,
  }
}

describe('nombreDelDuenio', () => {
  it('prefiere el username resuelto por el backend', () => {
    const l = lapida({ autor: 'Jardinera', duenio: { username: 'jardinera', rol: 'usuario' } })

    expect(nombreDelDuenio(l)).toBe('jardinera')
  })

  it('no muestra el texto libre de `autor` aunque exista', () => {
    // El caso real: `autor` dice "Anónimo" pero el dueño es @zombie.
    const l = lapida({ autor: 'Anónimo', duenio: { username: 'zombie', rol: 'zombie' } })

    expect(nombreDelDuenio(l)).not.toBe('Anónimo')
    expect(nombreDelDuenio(l)).toBe('zombie')
  })

  it('cae a `autor` solo cuando el backend no pudo resolver al dueño', () => {
    const l = lapida({ autor: 'Rosa Verde', duenio: undefined })

    expect(nombreDelDuenio(l)).toBe('Rosa Verde')
  })
})

describe('puedeBorrar', () => {
  const duenio = { username: 'jardinera', rol: 'usuario' }

  it('deja borrar al dueño de la lápida', () => {
    const l = lapida({ duenio })

    expect(puedeBorrar(l, { username: 'jardinera', rol: 'usuario' })).toBe(true)
  })

  it('deja borrar al admin aunque no sea el dueño', () => {
    const l = lapida({ duenio })

    expect(puedeBorrar(l, { username: 'admin', rol: 'admin' })).toBe(true)
  })

  it('no deja borrar a otra persona', () => {
    const l = lapida({ duenio })

    expect(puedeBorrar(l, { username: 'zombie', rol: 'usuario' })).toBe(false)
  })

  it('no deja borrar sin sesión', () => {
    const l = lapida({ duenio })

    expect(puedeBorrar(l, null)).toBe(false)
  })

  it('compara contra el username resuelto, no contra `autor`', () => {
    // Si comparara por `autor`, este caso daría true por accidente.
    const l = lapida({ autor: 'jardinera', duenio: { username: 'zombie', rol: 'zombie' } })

    expect(puedeBorrar(l, { username: 'jardinera', rol: 'usuario' })).toBe(false)
  })

  it('deja borrar cuando la respuesta no trajo `duenio` pero sí `usuarioId`', () => {
    // `POST /lapidas` y `POST /corona` no enriquecen con `duenio`: sin este
    // respaldo, el botón desaparecía al publicar o al dar una corona.
    const l = lapida({ duenio: undefined, usuarioId: 'u-42' })

    expect(puedeBorrar(l, { id: 'u-42', username: 'yo', rol: 'usuario' })).toBe(true)
  })

  it('no deja borrar a un tercero con otro `usuarioId`', () => {
    const l = lapida({ duenio: undefined, usuarioId: 'u-42' })

    expect(puedeBorrar(l, { id: 'u-99', username: 'otro', rol: 'usuario' })).toBe(false)
  })

  it('cae al username cuando la sesión no trae id', () => {
    // Defensa por si una sesión se construye sin `id`: no debe quedar sin
    // ninguna vía de comparación.
    const l = lapida({ duenio: { username: 'yo', rol: 'usuario' }, usuarioId: 'u-42' })

    expect(puedeBorrar(l, { username: 'yo', rol: 'usuario' })).toBe(true)
  })
})
