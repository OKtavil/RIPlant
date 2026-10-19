import { LapidasService } from './lapidas.service';

describe('LapidasService', () => {
  const grave = {
    id: 1,
    nombrePlanta: 'Cactus',
    epitafio: 'Siempre recordado',
    fechaFallecimiento: '2025-01-01',
    fechaPublicacion: '2025-01-02',
    autor: 'Jardinero',
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
    })),
    findOne: jest.fn(() => ({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(grave),
      }),
      lean: jest.fn().mockResolvedValue(grave),
    })),
    create: jest.fn().mockResolvedValue({ ...grave, toObject: () => grave }),
    findOneAndUpdate: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ ...grave, coronasCount: 1 }),
    }),
    findOneAndDelete: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(grave),
    }),
    bulkWrite: jest.fn().mockResolvedValue({}),
  };
  let service: LapidasService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LapidasService(model as never);
  });

  it('lists and finds graves', async () => {
    await expect(service.findAll()).resolves.toEqual([grave]);
    await expect(service.findOne(1)).resolves.toEqual(grave);
  });

  it('creates, updates, crowns and removes graves', async () => {
    await expect(service.create({
      nombrePlanta: 'Cactus',
      epitafio: 'Siempre recordado',
      fechaFallecimiento: '2025-01-01',
      categoriaId: 1,
      causaMuerte: 'Poca luz',
    })).resolves.toEqual(grave);
    await expect(service.update(1, grave)).resolves.toMatchObject({ id: 1 });
    await expect(service.giveCorona(1)).resolves.toMatchObject({ coronasCount: 1 });
    await expect(service.remove(1)).resolves.toEqual(grave);
  });

  it('seeds only an empty collection', async () => {
    await service.onModuleInit();
    expect(model.bulkWrite).toHaveBeenCalledTimes(1);
  });
});
