import { CategoriasService } from './categorias.service';

describe('CategoriasService', () => {
  const model = {
    countDocuments: jest.fn().mockResolvedValue(1),
    find: jest.fn(() => ({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ id: 1, nombre: 'Interior' }]),
      }),
    })),
    findOne: jest.fn(() => ({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 1, nombre: 'Interior' }),
      }),
    })),
    create: jest.fn().mockResolvedValue({ id: 2, nombre: 'Exterior' }),
    findOneAndUpdate: jest.fn().mockResolvedValue({ id: 1, nombre: 'Exterior' }),
    findOneAndDelete: jest.fn().mockResolvedValue({ id: 1, nombre: 'Exterior' }),
    bulkWrite: jest.fn().mockResolvedValue({}),
  };
  let service: CategoriasService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CategoriasService(model as never);
  });

  it('lists categories', async () => {
    await expect(service.findAll()).resolves.toEqual([{ id: 1, nombre: 'Interior' }]);
  });

  it('creates a category with the next numeric id', async () => {
    await expect(service.create({ nombre: 'Exterior' })).resolves.toEqual({
      id: 2,
      nombre: 'Exterior',
    });
  });

  it('updates and removes categories', async () => {
    await expect(service.update(1, { nombre: 'Exterior' })).resolves.toEqual({
      id: 1,
      nombre: 'Exterior',
    });
    await expect(service.remove(1)).resolves.toEqual({
      id: 1,
      nombre: 'Exterior',
    });
  });

  it('seeds only an empty collection', async () => {
    await service.onModuleInit();
    expect(model.bulkWrite).toHaveBeenCalledTimes(1);
  });
});
