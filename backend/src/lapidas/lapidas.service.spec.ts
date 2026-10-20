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
  let service: LapidasService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LapidasService(model as never, model as never);
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
    await expect(service.giveCorona(1)).resolves.toMatchObject({ coronasCount: 1 });
    await expect(service.remove(1)).resolves.toEqual(grave);
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
