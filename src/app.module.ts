import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HookManagerModule } from './hook-manager/hook-manager.module';
import { CwlService } from './cwl/cwl.service';
import { FireconectionService } from './fireconection/fireconection.service';
import { FireconectionModule } from './fireconection/fireconection.module';

@Module({
  imports: [HookManagerModule, FireconectionModule],
  controllers: [AppController],
  providers: [AppService, CwlService, FireconectionService],
})
export class AppModule {}
