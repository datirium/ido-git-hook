import { Test, TestingModule } from '@nestjs/testing';
import { CwlService } from './cwl.service';

describe('CwlService', () => {
  let service: CwlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CwlService],
    }).compile();

    service = module.get<CwlService>(CwlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
