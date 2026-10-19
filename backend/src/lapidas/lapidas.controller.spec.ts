import { Test, TestingModule } from '@nestjs/testing';
import { LapidasController } from './lapidas.controller';
import { LapidasService } from './lapidas.service';

describe('LapidasController', () => {
  let controller: LapidasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LapidasController],
      providers: [
        {
          provide: LapidasService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            giveCorona: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LapidasController>(LapidasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
