import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import axios from 'axios';
import { delay, getCurrentDate, getCurrentTime } from '../helper';
import { AppService } from '../app.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FirestoreService } from '../firestore/firestore.service';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import * as process from 'process';

import { TelegramBotService } from '../telegram-bot/telegram-bot.service';

dotenv.config();

@Injectable()
export class ScanningService {
  constructor(
    private AppService: AppService,
    private db: FirestoreService,
    private readonly telegramBotService: TelegramBotService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleScanData() {
    await this.startScanning();
    await this.getBotUpdates();
    await this.firestoreData();
  }

  async startScanning() {
    console.log('Starting Scanning...');
    let hasBlockModal = true;
    const urls = [
      'https://www.myparts.ge/ru/search/?pr_type_id=3&page=1&loc_id=2&cat_id=672&Attrs=711.714', // 4/100
      'https://www.myparts.ge/ru/search/?pr_type_id=3&page=1&loc_id=2&cat_id=672&Attrs=711.749', // 5/100
      'https://www.myparts.ge/ru/search/?pr_type_id=3&page=1&loc_id=2&cat_id=672&Attrs=711.716', // 5/112
      'https://www.myparts.ge/ru/search/?pr_type_id=3&page=1&loc_id=2&cat_id=672&Attrs=711.712', // 4/114.3
    ];
    const browser = await puppeteer.launch({ headless: true });

    for (const url of urls) {
      console.log('Scanning url: ', url);
      const page = await browser.newPage();
      await page.goto(url);
      await page.setViewport({ width: 1080, height: 1024 });

      if (hasBlockModal) {
        await page.waitForSelector(
          '#root > div.custom-modal-container.undefined > div > div.custom-modal-inner.fixed-mobile',
        );
        await page.click(
          '#root > div.custom-modal-container.undefined > div > div.custom-modal-inner.fixed-mobile > button',
        );
        hasBlockModal = false;
      }

      // await page.screenshot({path: 'example.png'});
      const elements = await page.$$('div.row a.text-dark');

      for (const element of elements) {
        const timeElement = await element.$('.bot_content div div');
        const time = await timeElement.evaluate((el) => {
          const regex = /(\d{2}\.\d{2}\.\d{4})/; // Регулярное выражение для поиска даты в формате dd.mm.yyyy
          const match = el.innerText.match(regex); // Поиск соответствия регулярному выражению
          return match ? match[0] : null; // Возвращаем найденную дату или null, если ничего не найдено
        });

        if (time !== getCurrentDate()) continue;
        const href = await element.evaluate((el) => el.href);

        const newPage = await browser.newPage();
        await newPage.goto(href);

        const yourElement = await newPage.$(
          '.shadow-filter-options-all i.stroke-bluepart-100',
        );
        if (yourElement) {
          await yourElement.click();
          await delay(500);

          const phoneElement = await newPage.$(
            '.shadow-filter-options-all a[href^="tel"]',
          );
          const phone = await newPage.evaluate((el) => el.href, phoneElement);

          const titleElement = await newPage.$(
            'div.mb-16px.text-overflow-ellipses-3-line.font-size-md-24.font-size-16.font-TBCX-bold',
          );
          const title = await newPage.evaluate(
            (el) => el.innerText,
            titleElement,
          );

          const descriptionElement = await newPage.$(
            '.custom-scroll-bar.custom-scroll-bar-animated',
          );
          const description = await newPage.evaluate(
            (el) => (el as HTMLElement).innerText,
            descriptionElement,
          );

          let images = [];

          const imageElements = await newPage.$$(
            '#root > main > div > div.container.max-width-1270px > div.row.mx-n12px > div.col.px-12px.overflow-hidden.mb-56px > div.d-flex.flex-lg-row.flex-column.mb-md-56px.mb-20px > div.w-lg-500px.w-100.min-width-lg-500px.z-index-1.mb-lg-0.mb-18px.max-width-lg-500px > div.custom-scroll-bar.horiz.d-md-block.d-none > div > div > div.swiper-wrapper .swiper-slide img',
          );
          if (!imageElements.length) {
            const imageElement = await newPage.$('div.swiper-wrapper img');
            const image = await newPage.evaluate((el) => el.src, imageElement);
            images.push(image);
          } else {
            if (imageElements && imageElements.length > 0) {
              images = await Promise.all(
                imageElements.map(async (element) => {
                  return await element.evaluate((el) => el.src);
                }),
              );
            }
          }

          // console.log(images);
          // document.querySelector('#root > main > div > div.container.max-width-1270px > div.row.mx-n12px > div.col.px-12px.overflow-hidden.mb-56px > div.d-flex.flex-lg-row.flex-column.mb-md-56px.mb-20px > div.w-lg-500px.w-100.min-width-lg-500px.z-index-1.mb-lg-0.mb-18px.max-width-lg-500px > div.custom-scroll-bar.horiz.d-md-block.d-none > div > div > div.swiper-wrapper')

          const priceElement = await newPage.$(
            '.shadow-filter-options-all span',
          );
          const price = await newPage.evaluate(
            (el) => el.innerHTML,
            priceElement,
          );

          const dateElement = await newPage.$(
            '.mb-24px.font-TBCX-medium.font-size-12',
          );
          const date = await newPage.evaluate(
            (el) => (el.children[1] as HTMLElement).innerText,
            dateElement,
          );

          const idElement = await newPage.$(
            '.mb-24px.font-TBCX-medium.font-size-12',
          );
          const id = await newPage.evaluate(
            (el) => (el.children[2] as HTMLElement).innerText,
            idElement,
          );

          this.AppService.parserItems$.next([
            ...this.AppService.parserItems$.getValue(),
            {
              phone,
              title,
              description: description || '',
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

    console.log(
      'End Scanning...',
      this.AppService.parserItems$.getValue().length,
    );

    const values = this.AppService.parserItems$.getValue();
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
    const items = values.filter((el) => !elementsSentArray.includes(el.id));
    this.AppService.parserItems$.next(items);
    console.log(
      'items',
      items.map((el) => el.id),
    );
    // if (elementsSentArray.includes(data[i].id)) continue;
  }

  async getBotUpdates() {
    console.log('getBotUpdates run ...');
    // const parserCollection = this.db
    //   .getFirestoreInstance()
    //   .collection('parser');
    // const elements = await parserCollection.get();
    // const elementsArray = [];
    // elements.forEach((doc) => {
    //   elementsArray.push(doc.data());
    // });
    const items = this.AppService.parserItems$.getValue();

    // let index = 0;
    for (let index = 0; index < items.length; index++) {
      let success = false;
      let retries = 3;

      // Повторяем запрос, пока не будет успешно выполнен или пока не закончатся попытки
      while (!success && retries > 0) {
        try {
          await this.sendPhotoToTelegram(items[index]);
          success = true;
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
            .set({ ids: [...elementsSentArray, items[index].id] });
        } catch (error) {
          console.log(`Error sending photo: ${error}`);
          retries--;
          console.log(`Retries left: ${retries}`);
          if (retries > 0) {
            console.log('Waiting for 2 seconds before retrying...');
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      }

      if (!success) {
        console.log(`Failed to send photo after ${retries} retries`);
        // Дополнительная логика для обработки ситуации, когда не удалось отправить фото
      }
    }
    // if (items.length > 0) {
    //   const interval = setInterval(() => {
    //     if (index < elementsArray.length) {
    //       const elem = elementsArray[index];
    //
    //       this.sendPhotoToTelegram(elem);
    //       console.log('count:', index);
    //       index++;
    //     } else {
    //       clearInterval(interval);
    //       console.log('end count');
    //     }
    //   }, 1000);
    // } else {
    //   console.log('end getBotUpdates');
    // }
  }

  async firestoreData() {
    // const snapshot = await this.db
    //   .getFirestoreInstance()
    //   .collection('parser')
    //   .get();
    // const promises = [];
    // snapshot.forEach((doc) => {
    //   const promise = this.db
    //     .getFirestoreInstance()
    //     .collection('parser')
    //     .doc(doc.id)
    //     .delete();
    //   promises.push(promise);
    // });
    // await Promise.all(promises);
    const data = this.AppService.parserItems$.getValue();
    const itemsLength = this.AppService.parserItems$.getValue().length;

    // for (let i = 0; i < itemsLength; i++) {
    //   // const elementsSentArray = [];
    //   // const elementsSent = await this.db
    //   //   .getFirestoreInstance()
    //   //   .collection('parser-sent')
    //   //   .doc('QajI331I2OoGHlQY5unW')
    //   //   .get();
    //   //
    //   // if (elementsSent.exists) {
    //   //   const data = elementsSent.data();
    //   //   if (data) {
    //   //     elementsSentArray.push(...data['ids']);
    //   //   }
    //   // }
    //   // if (elementsSentArray.includes(data[i].id)) continue;
    // //   const uniqueId = uuidv4();
    // //
    // //   const userJson = {
    // //     image: data[i].image,
    // //     price: data[i].price,
    // //     title: data[i].title,
    // //     phone: data[i].phone,
    // //     description: data[i].description,
    // //     date: data[i].date,
    // //     id: data[i].id,
    // //   };
    // //   await this.db
    // //     .getFirestoreInstance()
    // //     .collection('parser')
    // //     .doc(uniqueId)
    // //     .set(userJson);
    // }
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
      // const imageUrl = elem.image;
      const chatId = '-1001920945476';
      const local = '-1002144996647';
      const caption = `
${elem.title}      
⏰${elem.date} 
📞${elem.phone.slice(4)}
💰${elem.price}
${elem.description}
`;

      await this.telegramBotService.sendPhotoToGroup(
        elem.image,
        local,
        caption,
      );
      console.log('send id', elem.id);
    } catch (error) {
      console.log('error sending to telegraf');
    }
  }
}
