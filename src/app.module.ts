import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HookManagerModule } from './hook-manager/hook-manager.module';

@Module({
  imports: [HookManagerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
