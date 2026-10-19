import { Test, TestingModule } from '@nestjs/testing';
import { CategoriasService } from './categorias.service';

describe('CategoriasService', () => {
  let service: CategoriasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriasService],
    }).compile();

    service = module.get<CategoriasService>(CategoriasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('findAll should return an array of categories', async () => {
      const result = service.findAll();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        nombre: 'Categoria 1',
      });
    });
  });

  describe('create', () => {
    it('should create a new category and return the category', () => {
      const result = service.create({ nombre: 'Categoria 3' });

      expect(result).toMatchObject({
        id: expect.any(Number),
        nombre: 'Categoria 3',
      });
    });

    it('should increment the id of the new category', () => {
      const antes = service.findAll().length;
      service.create({ nombre: 'Categoria 4' });

      expect(service.findAll().length).toBe(antes + 1);
    });

    it('should assign an incremented id to the new category', () => {
      const a = service.create({ nombre: 'Categoria 5' });
      const b = service.create({ nombre: 'Categoria 6' });

      expect(b.id).toBe(a.id + 1);
      expect(b.id).not.toBe(a.id);
    });
  });
});
