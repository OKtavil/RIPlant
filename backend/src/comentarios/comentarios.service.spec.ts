import { ComentariosService } from './comentarios.service';

describe('ComentariosService', () => {
  const lapida = { id: 1 };
  const comentario = {
    _id: '653f00000000000000000001',
    lapidaId: 1,
    usuarioId: 'u1',
    autor: 'Jardinero',
    texto: 'Descanse en paz',
    creadoEn: new Date('2026-01-02T00:00:00.000Z'),
  };

  const comentarioModel = {
    find: jest.fn(() => ({
      sort: jest.fn(() => ({
        lean: jest.fn().mockResolvedValue([comentario]),
      })),
    })),
    create: jest.fn(),
    findOneAndDelete: jest.fn(() => ({ lean: jest.fn() })),
  };
  const lapidaModel = {
    findOne: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(lapida) })),
  };

  let service: ComentariosService;

  beforeEach(() => {
    jest.clearAllMocks();
    comentarioModel.create.mockResolvedValue({
      ...comentario,
      toObject: () => comentario,
    });
    lapidaModel.findOne = jest.fn(() => ({
      lean: jest.fn().mockResolvedValue(lapida),
    })) as never;
    service = new ComentariosService(
      comentarioModel as never,
      lapidaModel as never,
    );
  });

  const sesion = {
    usuario: { id: 'u1', username: 'Jardinero', rol: 'usuario' },
  } as never;

  it('lists the comments of a grave, exposed with an id', async () => {
    await expect(service.listar(1)).resolves.toEqual([
      expect.objectContaining({
        id: '653f00000000000000000001',
        autor: 'Jardinero',
        texto: 'Descanse en paz',
      }),
    ]);
    expect(comentarioModel.find).toHaveBeenCalledWith({ lapidaId: 1 });
  });

  it('takes author and user from the session, never from the body', async () => {
    await service.crear(
      1,
      sesion,
      { texto: 'Hola', autor: 'falsificado', usuarioId: 'otro' } as never,
    );
    expect(comentarioModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        lapidaId: 1,
        usuarioId: 'u1',
        autor: 'Jardinero',
        texto: 'Hola',
        creadoEn: expect.any(Date),
      }),
    );
    expect(comentarioModel.create.mock.calls[0][0]).not.toHaveProperty(
      'autor',
      'falsificado',
    );
  });

  it('404s on a grave that does not exist, without writing', async () => {
    lapidaModel.findOne = jest.fn(() => ({
      lean: jest.fn().mockResolvedValue(null),
    })) as never;
    await expect(
      service.crear(99, sesion, { texto: 'x' } as never),
    ).rejects.toMatchObject({ status: 404 });
    expect(comentarioModel.create).not.toHaveBeenCalled();
  });

  it('removes one comment, and 404s when it is gone', async () => {
    // Regresión: `findOneAndDelete({ _id: string })` borra el documento pero
    // `lean()` devuelve `null`, así que confiar en el retorno borra un
    // comentario y responde 404 igual. Se comprueba el borrado con el
    // resultado de `deleteOne`.
    comentarioModel.deleteOne = jest.fn().mockResolvedValue({
      deletedCount: 1,
    }) as never;
    await expect(service.borrar('653f00000000000000000001')).resolves.toEqual({
      id: '653f00000000000000000001',
    });
    expect(comentarioModel.deleteOne).toHaveBeenCalledWith({
      _id: '653f00000000000000000001',
    });

    comentarioModel.deleteOne = jest.fn().mockResolvedValue({
      deletedCount: 0,
    }) as never;
    await expect(
      service.borrar('653f00000000000000000002'),
    ).rejects.toMatchObject({ status: 404 });

    await expect(service.borrar('no-es-un-id')).rejects.toMatchObject({
      status: 400,
    });
  });
});
