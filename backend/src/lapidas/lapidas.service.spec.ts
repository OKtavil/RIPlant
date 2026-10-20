import { LapidasService } from './lapidas.service';

describe('LapidasService', () => {
  const grave = {
    id: 1,
    nombrePlanta: 'Cactus',
    epitafio: 'Siempre recordado',
    fechaFallecimiento: '2025-01-01',
    fechaPublicacion: '2025-01-02',
    autor: 'Jardinero',
    usuarioId: 'u1',
    categoriaId: 1,
    causaMuerte: 'Poca luz',
    fotoUrl: '',
    coronasCount: 0,
  };
  const model = {
    countDocuments: jest.fn().mockResolvedValue(1),
    find: jest.fn(() => ({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([grave]),
      }),
      lean: jest.fn().mockResolvedValue([grave]),
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    })),
    findOne: jest.fn(() => ({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(grave),
      }),
      lean: jest.fn().mockResolvedValue(grave),
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    })),
    create: jest.fn().mockResolvedValue({ ...grave, toObject: () => grave }),
    findOneAndUpdate: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ ...grave, coronasCount: 1 }),
    }),
    findOneAndDelete: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(grave),
    }),
    bulkWrite: jest.fn().mockResolvedValue({}),
    updateOne: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({}),
  };
  const coronaModel = {
    create: jest.fn(),
  };
  const comentarioModel = {
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  };
  const almacenamiento = {
    guardar: jest.fn(),
    borrar: jest.fn().mockResolvedValue(undefined),
  };
  let service: LapidasService;

  beforeEach(() => {
    jest.clearAllMocks();
    coronaModel.create.mockResolvedValue({ lapidaId: 1, usuarioId: 'u1' });
    comentarioModel.deleteMany.mockResolvedValue({ deletedCount: 1 });
    almacenamiento.guardar.mockResolvedValue({
      nombreArchivo: 'nuevo.png',
      rutaPublica: '/uploads/nuevo.png',
      tipo: 'image/png',
      bytes: 4,
    });
    almacenamiento.borrar.mockResolvedValue(undefined);
    service = new LapidasService(
      model as never,
      model as never,
      coronaModel as never,
      comentarioModel as never,
      almacenamiento as never,
    );
  });

  it('lists and finds graves', async () => {
    model.findOne = jest.fn((() => {
      const ret: any = { lean: jest.fn().mockResolvedValue(null) };
      ret.sort = jest.fn().mockReturnValue(ret);
      ret.select = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      return ret;
    }) as any);
    model.find = jest.fn(() => ({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([grave]),
      }),
      lean: jest.fn().mockResolvedValue([grave]),
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    })) as any;
    await expect(service.findAll()).resolves.toBeDefined();
    model.findOne = jest.fn((() => {
      const ret: any = { lean: jest.fn().mockResolvedValue(grave) };
      ret.sort = jest.fn().mockReturnValue(ret);
      ret.select = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      return ret;
    }) as any);
    await expect(service.findOne(1)).resolves.toBeDefined();
  });

  it('creates, updates, crowns and removes graves', async () => {
    await expect(service.create({
      nombrePlanta: 'Cactus',
      epitafio: 'Siempre recordado',
      fechaFallecimiento: '2025-01-01',
      categoriaId: 1,
      causaMuerte: 'Poca luz',
    } as any, { usuario: { id: 'u1', username: 'Jardinero' } } as any)).resolves.toEqual(grave);
    await expect(service.update(1, grave)).resolves.toMatchObject({ id: 1 });
    await expect(
      service.giveCorona(1, { usuario: { id: 'u1', username: 'Jardinero' } } as any),
    ).resolves.toMatchObject({ coronasCount: 1 });
    await expect(service.remove(1)).resolves.toEqual(grave);
  });

  it('records one corona per user and rejects the second', async () => {
    const sesion = { usuario: { id: 'u1', username: 'Jardinero' } } as any;

    await expect(service.giveCorona(1, sesion)).resolves.toMatchObject({
      coronasCount: 1,
    });
    expect(coronaModel.create).toHaveBeenCalledWith({
      lapidaId: 1,
      usuarioId: 'u1',
      creadaEn: expect.any(Date),
    });

    coronaModel.create.mockRejectedValueOnce({ code: 11000 });
    await expect(service.giveCorona(1, sesion)).rejects.toMatchObject({
      status: 409,
    });
  });

  it('removes every comment when the grave is removed (S6 cascade)', async () => {
    await expect(service.remove(1)).resolves.toEqual(grave);
    expect(comentarioModel.deleteMany).toHaveBeenCalledWith({ lapidaId: 1 });
  });

  it('stores the photo and persists its public path (S8)', async () => {
    model.findOne = jest.fn(() => ({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ ...grave, fotoUrl: '' }),
      }),
      lean: jest.fn().mockResolvedValue({ ...grave, fotoUrl: '' }),
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    })) as any;
    model.findOneAndUpdate = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ ...grave, fotoUrl: '/uploads/nuevo.png' }),
    }) as any;

    const buffer = Buffer.from('bytes-de-la-foto');
    const resultado = await service.asignarFoto(1, buffer);

    expect(almacenamiento.guardar).toHaveBeenCalledWith(buffer);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { id: 1 },
      { fotoUrl: '/uploads/nuevo.png' },
      { new: true, runValidators: true },
    );
    expect(resultado).toMatchObject({ fotoUrl: '/uploads/nuevo.png' });
  });

  it('borra la foto anterior al reemplazarla (S8, best-effort)', async () => {
    model.findOne = jest.fn(() => ({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ ...grave, fotoUrl: '/uploads/viejo.png' }),
      }),
      lean: jest.fn().mockResolvedValue({ ...grave, fotoUrl: '/uploads/viejo.png' }),
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    })) as any;
    model.findOneAndUpdate = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ ...grave, fotoUrl: '/uploads/nuevo.png' }),
    }) as any;

    await service.asignarFoto(1, Buffer.from('x'));

    expect(almacenamiento.borrar).toHaveBeenCalledWith('/uploads/viejo.png');
  });

  it('borra la foto cuando se borra la lápida (S8, best-effort)', async () => {
    model.findOneAndDelete = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ ...grave, fotoUrl: '/uploads/la-foto.png' }),
    }) as any;

    await service.remove(1);

    expect(almacenamiento.borrar).toHaveBeenCalledWith('/uploads/la-foto.png');
  });

  it('sin foto previa no hay archivo que borrar', async () => {
    model.findOneAndDelete = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ ...grave, fotoUrl: '' }),
    }) as any;

    await service.remove(1);

    // El servicio delega siempre; es el almacenamiento el que decide que
    // una ruta vacía no es un archivo (cubierto en su propio spec).
    expect(almacenamiento.borrar).toHaveBeenCalledWith('');
  });

  it('seeds only an empty collection', async () => {
    model.findOne = jest.fn((() => {
      const ret: any = { lean: jest.fn().mockResolvedValue(null) };
      ret.sort = jest.fn().mockReturnValue(ret);
      ret.select = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      return ret;
    }) as any);
    await service.onModuleInit();
    expect(model.updateOne).toHaveBeenCalled();
  });
});
