import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { delay, getCurrentDate, getCurrentTime } from '../helper';
import { AppService } from '../app.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FirestoreService } from '../firestore/firestore.service';
import * as dotenv from 'dotenv';

import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { urls } from '../consts';
import {
  closeSpamModal,
  hasSentTitle,
  isActualDate,
  scanElements,
} from '../functions';

dotenv.config();

@Injectable()
export class ScanningService {
  constructor(
    private AppService: AppService,
    private db: FirestoreService,
    private readonly telegramBotService: TelegramBotService,
  ) {
    this.handleScanData();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleScanData() {
    await this.startScanning(urls);
    await this.getBotUpdates();
    await this.firestoreData();
  }

  async startScanning(urls: string[] = []) {
    console.log('Starting Scanning...');

    const browser = await puppeteer.launch({ headless: true });
    let hasBlockModal = true;

    try {
      for (const url of urls) {
        console.log('Scanning url: ', url);
        const page = await browser.newPage();
        await page.goto(url);
        await page.setViewport({ width: 1080, height: 1024 });

        if (hasBlockModal) {
          await closeSpamModal(page);
          hasBlockModal = false;
        }

        const sentPosts = await this.db.getSentPosts();

        const elements = await page.$$('div.row a.text-dark');
        for (const element of elements) {
          if (await hasSentTitle(element, sentPosts)) continue;
          if ((await isActualDate(element)) !== getCurrentDate()) continue;

          const hrefDescriptionPost = await element.evaluate((el) => el.href);
          const newPage = await browser.newPage();
          await newPage.goto(hrefDescriptionPost);

          const hidePhoneNumber = await newPage.$(
            '.shadow-filter-options-all i.stroke-bluepart-100',
          );
          if (hidePhoneNumber) {
            await hidePhoneNumber.click();
            await delay(500);

            const { phone, title, description, images, price, date, id } =
              await scanElements(newPage);

            this.AppService.parserItems$.next([
              ...this.AppService.parserItems$.getValue(),
              {
                phone,
                title,
                description,
                image: images,
                price,
                date,
                id,
              },
            ]);
          }
          await newPage.close();
        }
        await page.close();
      }
    } catch (error) {
      console.error('Error during scanning:', error);
    } finally {
      await browser.close();
      console.log('End Scanning...');
      console.log(
        'End Scanning...',
        this.AppService.parserItems$.getValue().length,
      );
    }
  }

  async getBotUpdates() {
    console.log('getBotUpdates run ...');

    const interval = setInterval(async () => {
      const items = this.AppService.parserItems$.getValue();
      if (items.length === 0) {
        clearInterval(interval);
        console.log('End getBotUpdates...');
        return;
      }
      try {
        const post = items[0];
        await this.sendPhotoToTelegram(post);
        console.log('count: ', items.length);
        const elementsSentArray = [];
        const elementsSent = await this.db
          .getFirestoreInstance()
          .collection('parser-sent')
          .doc('QajI331I2OoGHlQY5unW')
          .get();

        if (elementsSent.exists) {
          const data = elementsSent.data();
          if (data) {
            elementsSentArray.push(...data['ids']);
          }
        }

        await this.db
          .getFirestoreInstance()
          .collection('parser-sent')
          .doc('QajI331I2OoGHlQY5unW')
          .set({
            ids: [...elementsSentArray, { id: post.id, title: post.title }],
          });
        this.AppService.parserItems$.next(items.slice(1));
      } catch (err) {}
    }, 60000);
  }

  async firestoreData() {
    const resultSync = await this.db
      .getFirestoreInstance()
      .collection('parser-sync')
      .doc('iT1hGDYGNvuC0FpeOKoH')
      .get();

    const transactions = [];
    if (resultSync.exists) {
      const data = resultSync.data();
      if (data) {
        transactions.push(
          ...data['date'],
          `${getCurrentDate()} ${getCurrentTime()}`,
        );
      }
    }

    await this.db
      .getFirestoreInstance()
      .collection('parser-sync')
      .doc('iT1hGDYGNvuC0FpeOKoH')
      .set({ date: transactions });
  }

  async sendPhotoToTelegram(elem: any, retries = 3) {
    try {
      const chatId = '-1001920945476';
      // const local = '-1002144996647';
      const caption = `
${elem.title}      
⏰${elem.date} 
📞${elem.phone.slice(4)}
💰${elem.price}
${elem.description}
`;

      await this.telegramBotService.sendPhotoToGroup(
        elem.image,
        chatId,
        caption,
      );
      console.log('send id', elem.id);
    } catch (error) {
      console.log('error sending to telegraf');
    }
  }
}
