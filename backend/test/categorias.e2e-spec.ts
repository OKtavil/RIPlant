import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CategoriasController } from './../src/categorias/categorias.controller';
import { CategoriasService } from './../src/categorias/categorias.service';
import { applyValidationPipe } from '../src/shared/validation-pipe';

describe('Categorias (e2e)', () => {
  let app: INestApplication;
  let service: CategoriasService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CategoriasController],
      providers: [CategoriasService],
    }).compile();

    app = moduleFixture.createNestApplication();
    service = moduleFixture.get<CategoriasService>(CategoriasService);
    applyValidationPipe(app);
    await app.init();
  });

  describe('GET /categorias', () => {
    it('should return an array of categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/categorias')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /categorias', () => {
    it('should create a new category', async () => {
      const antes = service.findAll().length;
      const response = await request(app.getHttpServer())
        .post('/categorias')
        .send({ nombre: 'Categoria 3' })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        nombre: 'Categoria 3',
      });

      expect(service.findAll().length).toBe(antes + 1);
    });

    it('should return 400 if nombre is missing', async () => {
      const antes = service.findAll().length;
      const response = await request(app.getHttpServer())
        .post('/categorias')
        .send({})
        .expect(400);

      expect(response.body.message).toContain(
        'El nombre de la categoría no debe estar vacío',
      );
      expect(service.findAll().length).toBe(antes);
    });

    it('should return 400 if nombre is empty', async () => {
      const antes = service.findAll().length;
      const response = await request(app.getHttpServer())
        .post('/categorias')
        .send({ nombre: '' })
        .expect(400);

      expect(response.body.message).toContain(
        'El nombre de la categoría no debe estar vacío',
      );
      expect(service.findAll().length).toBe(antes);
    });

    it('should return 400 if nombre is not a string', async () => {
      const antes = service.findAll().length;
      const response = await request(app.getHttpServer())
        .post('/categorias')
        .send({ nombre: 123 })
        .expect(400);

      expect(response.body.message).toContain(
        'El nombre de la categoría debe ser una cadena de texto',
      );
      expect(service.findAll().length).toBe(antes);
    });

    it('should return 400 if nombre is too short', async () => {
      const antes = service.findAll().length;
      const response = await request(app.getHttpServer())
        .post('/categorias')
        .send({ nombre: 'a' })
        .expect(400);

      expect(response.body.message).toContain(
        'El nombre de la categoría debe tener al menos 3 caracteres',
      );
      expect(service.findAll().length).toBe(antes);
    });

    it('should return 400 if nombre is too long', async () => {
      const antes = service.findAll().length;
      const response = await request(app.getHttpServer())
        .post('/categorias')
        .send({ nombre: 'a'.repeat(21) })
        .expect(400);

      expect(response.body.message).toContain(
        'El nombre de la categoría debe tener como máximo 20 caracteres',
      );
      expect(service.findAll().length).toBe(antes);
    });

    it('should return 400 if is a string with only spaces', async () => {
      const antes = service.findAll().length;
      const response = await request(app.getHttpServer())
        .post('/categorias')
        .send({ nombre: '   ' })
        .expect(400);

      expect(response.body.message).toContain(
        'El nombre de la categoría no debe contener solo espacios en blanco',
      );
      expect(service.findAll().length).toBe(antes);
    });

    it('should return 400 if body contain other properties', async () => {
      const antes = service.findAll().length;
      const response = await request(app.getHttpServer())
        .post('/categorias')
        .send({ nombre: 'Categoria 4', rol: 'admin' })
        .expect(400);

      expect(response.body.message).toContain('property rol should not exist');
      expect(service.findAll().length).toBe(antes);
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
