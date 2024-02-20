import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScanningService } from './scanning/scanning.service';
import { FirestoreService } from './firestore/firestore.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AppController],
  providers: [AppService, ScanningService, FirestoreService],
})
export class AppModule {
  constructor(private readonly scanningService: ScanningService) {
    this.scanningService.handleScanData();
  }
}
