import { Test, TestingModule } from '@nestjs/testing';
import { HookManagerController } from './hook-manager.controller';

describe('HookManagerController', () => {
  let controller: HookManagerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HookManagerController],
    }).compile();

    controller = module.get<HookManagerController>(HookManagerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
