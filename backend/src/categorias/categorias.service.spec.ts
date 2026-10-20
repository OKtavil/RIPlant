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

  it('seeds six categories so every seeded grave has one', async () => {
    await service.onModuleInit();
    const [operaciones] = (model.bulkWrite as jest.Mock).mock.calls[0];
    expect(operaciones).toHaveLength(6);
    expect(operaciones.map((op: any) => op.updateOne.filter.id)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(
      operaciones.map((op: any) => op.updateOne.update.$setOnInsert.nombre),
    ).toEqual([
      'Descuido',
      'Exceso de cariño',
      'Olvido',
      'Clima extremo',
      'Plagas',
      'Accidente',
    ]);
  });
});
