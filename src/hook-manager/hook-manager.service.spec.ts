import { Test, TestingModule } from '@nestjs/testing';
import { HookManagerService } from './hook-manager.service';

describe('HookManagerService', () => {
  let service: HookManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HookManagerService],
    }).compile();

    service = module.get<HookManagerService>(HookManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
