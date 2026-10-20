import { describe, expect, it } from 'vitest'
import { parsearRuta, rutaDeVista } from './ruta'

describe('parsearRuta', () => {
  it('la raíz es el inicio', () => {
    expect(parsearRuta('/')).toEqual({ tipo: 'vista', vista: 'inicio' })
  })

  it('una ruta vacía también es el inicio', () => {
    expect(parsearRuta('')).toEqual({ tipo: 'vista', vista: 'inicio' })
  })

  it('lee cada vista de su ruta', () => {
    expect(parsearRuta('/ranking')).toEqual({ tipo: 'vista', vista: 'ranking' })
    expect(parsearRuta('/publicar')).toEqual({ tipo: 'vista', vista: 'publicar' })
    expect(parsearRuta('/perfil')).toEqual({ tipo: 'vista', vista: 'perfil' })
    expect(parsearRuta('/categorias')).toEqual({ tipo: 'vista', vista: 'categorias' })
  })

  it('lee el id de una lápida del detalle', () => {
    expect(parsearRuta('/lapidas/42')).toEqual({ tipo: 'detalle', id: 42 })
  })

  it('ignora la barra final', () => {
    expect(parsearRuta('/ranking/')).toEqual({ tipo: 'vista', vista: 'ranking' })
    expect(parsearRuta('/lapidas/42/')).toEqual({ tipo: 'detalle', id: 42 })
  })

  it('ignora el query string', () => {
    expect(parsearRuta('/ranking?algo=1')).toEqual({ tipo: 'vista', vista: 'ranking' })
  })

  it('una ruta desconocida cae al inicio en vez de romper', () => {
    // Un link viejo o mal escrito no debería dejar la pantalla en blanco.
    expect(parsearRuta('/no-existe')).toEqual({ tipo: 'vista', vista: 'inicio' })
  })

  it('una lápida con id inválido cae al inicio', () => {
    expect(parsearRuta('/lapidas/abc')).toEqual({ tipo: 'vista', vista: 'inicio' })
    expect(parsearRuta('/lapidas/0')).toEqual({ tipo: 'vista', vista: 'inicio' })
    expect(parsearRuta('/lapidas/-3')).toEqual({ tipo: 'vista', vista: 'inicio' })
    expect(parsearRuta('/lapidas/')).toEqual({ tipo: 'vista', vista: 'inicio' })
  })
})

describe('rutaDeVista', () => {
  it('el inicio es la raíz', () => {
    expect(rutaDeVista('inicio')).toBe('/')
  })

  it('cada vista tiene su ruta', () => {
    expect(rutaDeVista('ranking')).toBe('/ranking')
    expect(rutaDeVista('publicar')).toBe('/publicar')
    expect(rutaDeVista('perfil')).toBe('/perfil')
    expect(rutaDeVista('categorias')).toBe('/categorias')
  })

  it('la ida y vuelta se conserva', () => {
    // El contrato que importa: lo que se escribe en la barra es lo que se lee.
    const vistas = ['inicio', 'ranking', 'publicar', 'perfil', 'categorias'] as const
    for (const vista of vistas) {
      const ruta = rutaDeVista(vista)
      expect(parsearRuta(ruta)).toEqual({ tipo: 'vista', vista })
    }
  })
})
