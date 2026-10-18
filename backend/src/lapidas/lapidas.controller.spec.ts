import { Test, TestingModule } from '@nestjs/testing';
import { LapidasController } from './lapidas.controller';

describe('LapidasController', () => {
  let controller: LapidasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LapidasController],
    }).compile();

    controller = module.get<LapidasController>(LapidasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
