import { Injectable } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TelegramBotService {
  private readonly bot: Telegraf;

  constructor() {
    this.bot = new Telegraf('6704239325:AAHZMAyo92DAJuUYmtWth0NQEZAMw9S7KG8');
    this.bot.launch();
  }

  async sendPhotoToGroup(
    imageUrls: string[],
    chatId: string,
    caption: string,
  ): Promise<void> {
    try {
      const media = [];

      for (let i = 0; i < imageUrls.length; i++) {
        const localImagePath = await this.downloadImage(imageUrls[i]);
        const imageData = fs.createReadStream(localImagePath);

        media.push({
          type: 'photo',
          media: { source: imageData },
          caption: i === 0 ? caption : '',
        });
      }

      await this.bot.telegram.sendMediaGroup(chatId, media);

      // const imageData = await this.downloadImage(imageUrl);
      // await this.bot.telegram.sendPhoto(
      //   chatId,
      //   { source: imageData },
      //   { caption },
      // );
      console.log('Photo sent successfully to group');
    } catch (error) {
      console.error('Failed to send photo to group:', error);
    }
  }

  private async downloadImage(imageUrl: string): Promise<Buffer> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data, 'binary');
    } catch (error) {
      console.error('Error downloading image:', error);
      throw error;
    }
  }
}
