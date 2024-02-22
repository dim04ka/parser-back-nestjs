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

dotenv.config();

@Injectable()
export class ScanningService {
  constructor(
    private AppService: AppService,
    private db: FirestoreService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleScanData() {
    await this.startScanning();
    await this.firestoreData();
    await this.getBotUpdates();
  }

  async startScanning() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(
      'https://www.myparts.ge/ka/search/?pr_type_id=3&page=1&cat_id=765',
    );

    await page.setViewport({ width: 1080, height: 1024 });

    await page.waitForSelector(
      '#root > div.custom-modal-container.undefined > div > div.custom-modal-inner.fixed-mobile',
    );
    await page.click(
      '#root > div.custom-modal-container.undefined > div > div.custom-modal-inner.fixed-mobile > button',
    );
    // await page.screenshot({path: 'example.png'});
    const elements = await page.$$('div.row a.text-dark');

    for (const element of elements) {
      const timeElement = await element.$('.bot_content div div');
      const time = await timeElement.evaluate((el) => {
        const regex = /(\d{2}\.\d{2}\.\d{4})/; // Регулярное выражение для поиска даты в формате dd.mm.yyyy
        const match = el.innerText.match(regex); // Поиск соответствия регулярному выражению
        return match ? match[0] : null; // Возвращаем найденную дату или null, если ничего не найдено
      });

      if (time !== getCurrentDate()) break;
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
          (el: HTMLElement) => el.innerText,
          descriptionElement,
        );

        const imageElement = await newPage.$('div.swiper-wrapper img');
        const image = await newPage.evaluate((el) => el.src, imageElement);

        const priceElement = await newPage.$('.shadow-filter-options-all span');
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
            image,
            price,
            date,
            id,
          },
        ]);
      }
      await newPage.close();
    }

    await browser.close();
  }

  async getBotUpdates() {
    const parserCollection = this.db
      .getFirestoreInstance()
      .collection('parser');
    const elements = await parserCollection.get();
    const elementsArray = [];
    elements.forEach((doc) => {
      elementsArray.push(doc.data());
    });

    for (const elem of elementsArray) {
      axios
        .post(
          `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendPhoto`,
          {
            chat_id: process.env.TELEGRAM_CHAT_ID,
            photo: elem.image,
            caption: `${elem.date} ${elem.phone} - ${elem.title} - ${elem.description} - price:${elem.price}`,
          },
        )
        .catch(function (error) {
          console.error('Error sending photo to Telegram:', error);
        });
    }
  }

  async firestoreData() {
    const snapshot = await this.db
      .getFirestoreInstance()
      .collection('parser')
      .get();
    const promises = [];
    snapshot.forEach((doc) => {
      const promise = this.db
        .getFirestoreInstance()
        .collection('parser')
        .doc(doc.id)
        .delete();
      promises.push(promise);
    });
    await Promise.all(promises);
    const data = this.AppService.parserItems$.getValue();
    const itemsLength = this.AppService.parserItems$.getValue().length;

    for (let i = 0; i < itemsLength; i++) {
      const elementsSentArray = [];
      const elementsSent = await this.db
        .getFirestoreInstance()
        .collection('parser-sent')
        .doc('nqgFIUARWVg26mcLMtB4')
        .get();

      if (elementsSent.exists) {
        const data = elementsSent.data();
        elementsSentArray.push(...data.ids);
      }
      if (elementsSentArray.includes(data[i].id)) continue;
      await this.db
        .getFirestoreInstance()
        .collection('parser-sent')
        .doc('nqgFIUARWVg26mcLMtB4')
        .set({ ids: [...elementsSentArray, data[i].id] });

      const uniqueId = uuidv4();

      const userJson = {
        image: data[i].image,
        price: data[i].price,
        title: data[i].title,
        phone: data[i].phone,
        description: data[i].description,
        date: data[i].date,
        id: data[i].id,
      };
      await this.db
        .getFirestoreInstance()
        .collection('parser')
        .doc(uniqueId)
        .set(userJson);
    }
    const resultSync = await this.db
      .getFirestoreInstance()
      .collection('parser-sync')
      .doc('iT1hGDYGNvuC0FpeOKoH')
      .get();

    const transactions = [];
    if (resultSync.exists) {
      const data = resultSync.data();
      transactions.push(
        ...data.date,
        `${getCurrentDate()} ${getCurrentTime()}`,
      );
    }

    await this.db
      .getFirestoreInstance()
      .collection('parser-sync')
      .doc('iT1hGDYGNvuC0FpeOKoH')
      .set({ date: transactions });
  }
}
