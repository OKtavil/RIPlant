import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Category } from '../../categorias/model/categoria'
import type { CreateGraveInput, Grave } from '../model/lapida'
import { PublicarPage } from './PublicarPage'

afterEach(() => {
  vi.unstubAllGlobals()
})

const CATEGORIAS: Category[] = [{ id: 1, nombre: 'Suculentas' }]

function lapida(parcial: Partial<Grave> = {}): Grave {
  return {
    id: 9,
    nombrePlanta: 'Pepino',
    epitafio: 'Se fue',
    fechaFallecimiento: '2025-01-01',
    fechaPublicacion: '2025-01-02',
    autor: 'Anónimo',
    categoriaId: 1,
    causaMuerte: 'Poca luz',
    fotoUrl: '',
    coronasCount: 0,
    usuarioId: 'u1',
    ...parcial,
  }
}

/** Completa los campos obligatorios para que el submit pase la validación. */
function completarFormulario() {
  fireEvent.change(screen.getByLabelText(/nombre de la planta/i), {
    target: { value: 'Pepino' },
  })
  fireEvent.change(screen.getByLabelText(/categoría/i), { target: { value: '1' } })
  fireEvent.change(screen.getByLabelText(/fecha de fallecimiento/i), {
    target: { value: '2025-01-01' },
  })
  fireEvent.change(screen.getByLabelText(/causa de muerte/i), {
    target: { value: 'Poca luz' },
  })
  fireEvent.change(screen.getByLabelText(/epitafio/i), { target: { value: 'Se fue' } })
}

function archivo(nombre = 'planta.png', bytes = 'bytes', tipo = 'image/png') {
  return new File([bytes], nombre, { type: tipo })
}

/**
 * jsdom no implementa `URL.createObjectURL`. Se stubea para poder verificar
 * tanto el `src` de la vista previa como la liberación del object URL.
 */
function stubObjectUrl() {
  const crear = vi.fn(() => 'blob:vista-previa')
  const revocar = vi.fn()
  URL.createObjectURL = crear
  URL.revokeObjectURL = revocar
  return { crear, revocar }
}

describe('PublicarPage', () => {
  it('ya no muestra el aviso de que la subida no está disponible', () => {
    render(<PublicarPage categorias={CATEGORIAS} onPublicar={vi.fn()} />)

    expect(screen.queryByText(/no disponible todavía/i)).toBeNull()
  })

  it('ofrece un campo de archivo para la foto', () => {
    render(<PublicarPage categorias={CATEGORIAS} onPublicar={vi.fn()} />)

    expect(screen.getByLabelText(/foto/i)).toBeTruthy()
  })

  it('publica sin foto cuando no se elige ninguna', async () => {
    const onPublicar = vi.fn().mockResolvedValue(lapida())
    render(<PublicarPage categorias={CATEGORIAS} onPublicar={onPublicar} />)
    completarFormulario()

    fireEvent.click(screen.getByRole('button', { name: /publicar lápida/i }))

    await waitFor(() => expect(onPublicar).toHaveBeenCalled())
    // Sin archivo, el input viaja como `undefined`: no se inventa una foto.
    const [input, foto] = onPublicar.mock.calls[0] as [CreateGraveInput, File | undefined]
    expect(input.nombrePlanta).toBe('Pepino')
    expect(foto).toBeUndefined()
  })

  it('pasa el archivo elegido junto al formulario', async () => {
    const onPublicar = vi.fn().mockResolvedValue(lapida())
    render(<PublicarPage categorias={CATEGORIAS} onPublicar={onPublicar} />)
    completarFormulario()
    const elegido = archivo()
    fireEvent.change(screen.getByLabelText(/foto/i), { target: { files: [elegido] } })

    fireEvent.click(screen.getByRole('button', { name: /publicar lápida/i }))

    await waitFor(() => expect(onPublicar).toHaveBeenCalled())
    const [, foto] = onPublicar.mock.calls[0] as [CreateGraveInput, File | undefined]
    expect(foto).toBe(elegido)
  })

  it('rechaza una fecha de fallecimiento futura', () => {
    const onPublicar = vi.fn()
    render(<PublicarPage categorias={CATEGORIAS} onPublicar={onPublicar} />)
    completarFormulario()
    const manana = new Date()
    manana.setDate(manana.getDate() + 1)
    const mananaLocal = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, '0')}-${String(manana.getDate()).padStart(2, '0')}`
    fireEvent.change(screen.getByLabelText(/fecha de fallecimiento/i), {
      target: { value: mananaLocal },
    })

    fireEvent.click(screen.getByRole('button', { name: /publicar lápida/i }))

    expect(onPublicar).not.toHaveBeenCalled()
    expect(screen.getByText(/no puede ser futura/i)).toBeTruthy()
  })

  it('rechaza una fecha de fallecimiento anterior a 1900', () => {
    const onPublicar = vi.fn()
    render(<PublicarPage categorias={CATEGORIAS} onPublicar={onPublicar} />)
    completarFormulario()
    fireEvent.change(screen.getByLabelText(/fecha de fallecimiento/i), {
      target: { value: '1899-12-31' },
    })

    fireEvent.click(screen.getByRole('button', { name: /publicar lápida/i }))

    expect(onPublicar).not.toHaveBeenCalled()
    expect(screen.getByText(/anterior a 1900/i)).toBeTruthy()
  })

  it('rechaza un archivo de más de 5 MB sin llegar a publicar', async () => {
    const onPublicar = vi.fn()
    render(<PublicarPage categorias={CATEGORIAS} onPublicar={onPublicar} />)
    completarFormulario()
    // 5 MB + 1 byte, por encima del tope que aplica multer en el backend.
    const grande = archivo('grande.png', 'x'.repeat(5 * 1024 * 1024 + 1))

    fireEvent.change(screen.getByLabelText(/foto/i), { target: { files: [grande] } })
    fireEvent.click(screen.getByRole('button', { name: /publicar lápida/i }))

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(onPublicar).not.toHaveBeenCalled()
  })

  it('muestra el error del padre cuando la publicación falla', async () => {
    const onPublicar = vi.fn().mockRejectedValue(new Error('boom'))
    render(<PublicarPage categorias={CATEGORIAS} onPublicar={onPublicar} />)
    completarFormulario()

    fireEvent.click(screen.getByRole('button', { name: /publicar lápida/i }))

    expect(await screen.findByRole('alert')).toBeTruthy()
  })
})

describe('E006 — el borrador está atado a la identidad de la sesión', () => {
  it('descarta lo escrito cuando cambia la sesión', () => {
    const onPublicar = vi.fn()
    const { rerender } = render(
      <PublicarPage categorias={CATEGORIAS} sesionId="u1" onPublicar={onPublicar} />,
    )
    fireEvent.change(screen.getByLabelText(/epitafio/i), {
      target: { value: 'Borrador privado de u1' },
    })
    fireEvent.change(screen.getByLabelText(/nombre de la planta/i), {
      target: { value: 'Pepino' },
    })

    // Otra persona inicia sesión en el mismo navegador.
    rerender(<PublicarPage categorias={CATEGORIAS} sesionId="u2" onPublicar={onPublicar} />)

    expect((screen.getByLabelText(/epitafio/i) as HTMLTextAreaElement).value).toBe('')
    expect((screen.getByLabelText(/nombre de la planta/i) as HTMLInputElement).value).toBe('')
  })
})

describe('R002 — vista previa de la foto en la lápida', () => {
  it('muestra la foto elegida dentro del marco de la tarjeta real', async () => {
    stubObjectUrl()
    render(<PublicarPage categorias={CATEGORIAS} onPublicar={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/foto/i), {
      target: { files: [archivo('planta.png')] },
    })

    const previa = await screen.findByAltText(/vista previa de la foto elegida/i)
    expect(previa.getAttribute('src')).toBe('blob:vista-previa')
    // Mismo marco que `GraveCard`, no un thumbnail aparte: si cambia el diseño
    // de la tarjeta, la previa cambia con él.
    expect(previa.className).toContain('lapida__foto-img')
    expect(previa.parentElement?.className).toContain('lapida__foto')
    expect(screen.getByText(/así se va a ver/i)).toBeTruthy()
  })

  it('libera el object URL al cambiar de foto y al desmontar', async () => {
    const { revocar } = stubObjectUrl()
    const { unmount } = render(<PublicarPage categorias={CATEGORIAS} onPublicar={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/foto/i), {
      target: { files: [archivo('primera.png')] },
    })
    await screen.findByAltText(/vista previa de la foto elegida/i)
    expect(revocar).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/foto/i), {
      target: { files: [archivo('segunda.png')] },
    })
    await waitFor(() => expect(revocar).toHaveBeenCalledTimes(1))

    unmount()
    expect(revocar).toHaveBeenCalledTimes(2)
  })
})
