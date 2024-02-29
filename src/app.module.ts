import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScanningService } from './scanning/scanning.service';
import { FirestoreService } from './firestore/firestore.service';
import { ScheduleModule } from '@nestjs/schedule';
import { TelegramBotService } from './telegram-bot/telegram-bot.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AppController],
  providers: [
    AppService,
    ScanningService,
    FirestoreService,
    TelegramBotService,
  ],
})
export class AppModule {}
