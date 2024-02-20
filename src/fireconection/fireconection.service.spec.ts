import { Test, TestingModule } from '@nestjs/testing';
import { FireconectionService } from './fireconection.service';

describe('FireconectionService', () => {
  let service: FireconectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FireconectionService],
    }).compile();

    service = module.get<FireconectionService>(FireconectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
