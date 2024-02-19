import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();

let second = 0
async function scanData() {

  try {
    console.log('Scanning data...', second++)
    // весь код, который находится внутри app.get('/scan'), поместите здесь
    // ...
  } catch (error) {
    console.error('Error during scanning:', error);
  }
}

// Вызовите scanData() в момент запуска сервера, чтобы он начал работать сразу
scanData();

// Затем используйте setInterval, чтобы вызывать scanData() каждый час
setInterval(scanData, 1000);
