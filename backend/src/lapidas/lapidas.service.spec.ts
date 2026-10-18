import { Test, TestingModule } from '@nestjs/testing';
import { LapidasService } from './lapidas.service';

describe('LapidasService', () => {
  let service: LapidasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LapidasService],
    }).compile();

    service = module.get<LapidasService>(LapidasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
