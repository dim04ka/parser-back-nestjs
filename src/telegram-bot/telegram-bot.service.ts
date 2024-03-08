import { Injectable } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import axios from 'axios';

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
      const media = await this.getMedia(imageUrls, caption);

      await this.bot.telegram.sendMediaGroup(chatId, media);

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

  private async getMedia(imageUrls: string[], caption: string) {
    let firstThreeImageUrl = [];
    const media = [];
    if (imageUrls.length > 9) {
      firstThreeImageUrl = imageUrls.slice(0, 9);
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
    return media;
  }
}
