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
      let firstThreeImageUrl = [];
      const media = [];
      if (imageUrls.length > 3) {
        firstThreeImageUrl = imageUrls.slice(0, 3);
      } else {
        firstThreeImageUrl = imageUrls;
      }

      for (let i = 0; i < firstThreeImageUrl.length; i++) {
        const localImagePath = await this.downloadImage(imageUrls[i]);
        // const imageData = fs.createReadStream(localImagePath);

        media.push({
          type: 'photo',
          media: { source: localImagePath },
          caption: i === 0 ? caption : '',
        });
      }

      await this.bot.telegram.sendMediaGroup(chatId, media);

      console.log('Photo sent successfully to group');
    } catch (error) {
      console.error('Failed to send photo to group:', error);
      // repeat after 2 seconds
      setTimeout(() => {
        this.sendPhotoToGroup(imageUrls, chatId, caption);
      }, 2000);
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
