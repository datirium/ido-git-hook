import { Module } from '@nestjs/common';
import { FireconectionService } from './fireconection.service';
import * as admin from 'firebase-admin';


@Module({
  providers: [FireconectionService]
})
export class FireconectionModule {}
