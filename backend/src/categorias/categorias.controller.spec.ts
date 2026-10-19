import { Test, TestingModule } from '@nestjs/testing';
import { CategoriasController } from './categorias.controller';
import { CategoriasService } from './categorias.service';

describe('CategoriasController', () => {
  let controller: CategoriasController;

  let mockCategoriasService: {
    findAll: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    mockCategoriasService = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriasController],
      providers: [
        { provide: CategoriasService, useValue: mockCategoriasService },
      ],
    }).compile();

    controller = module.get<CategoriasController>(CategoriasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of categories', () => {
      const categorias = [
        { id: 1, nombre: 'Categoria 1' },
        { id: 2, nombre: 'Categoria 2' },
      ];
      mockCategoriasService.findAll.mockReturnValue(categorias);

      const result = controller.findAll();

      expect(mockCategoriasService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(categorias);
    });
  });

  describe('create', () => {
    it('should create a new category', () => {
      const createCategoriaDto = { nombre: 'Categoria 3' };
      const createdCategoria = { id: 3, nombre: 'Categoria 3' };
      mockCategoriasService.create.mockReturnValue(createdCategoria);

      const result = controller.create(createCategoriaDto);

      expect(mockCategoriasService.create).toHaveBeenCalledWith(
        createCategoriaDto,
      );
      expect(result).toEqual(createdCategoria);
    });

    it('should update a category', () => {
      const dto = { nombre: 'Interior' };
      const updated = { id: 2, nombre: 'Interior' };
      mockCategoriasService.update.mockReturnValue(updated);

      expect(controller.update(2, dto)).toEqual(updated);
      expect(mockCategoriasService.update).toHaveBeenCalledWith(2, dto);
    });

    it('should remove a category', () => {
      const removed = { id: 2, nombre: 'Interior' };
      mockCategoriasService.remove.mockReturnValue(removed);

      expect(controller.remove(2)).toEqual(removed);
      expect(mockCategoriasService.remove).toHaveBeenCalledWith(2);
    });
  });
});
