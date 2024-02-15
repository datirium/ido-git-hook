import { Module } from '@nestjs/common';
import { HookManagerService } from './hook-manager.service';
import { HookManagerController } from './hook-manager.controller';

@Module({
  providers: [HookManagerService],
  controllers: [HookManagerController]
})
export class HookManagerModule {}
