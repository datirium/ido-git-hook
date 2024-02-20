import { Module } from '@nestjs/common';
import { HookManagerService } from './hook-manager.service';
import { HookManagerController } from './hook-manager.controller';
import { CwlService } from 'src/cwl/cwl.service';
import { FireconectionService } from 'src/fireconection/fireconection.service';

@Module({
  providers: [HookManagerService,CwlService,FireconectionService],
  controllers: [HookManagerController],
  
})
export class HookManagerModule {}
