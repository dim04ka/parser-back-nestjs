import { ElementHandle, Page } from 'puppeteer';
import { IScanElement, Item } from '../models/item.interface';

export const closeSpamModal = async (page: Page) => {
  await page.waitForSelector(
    '#root > div.custom-modal-container.undefined > div > div.custom-modal-inner.fixed-mobile',
  );
  await page.click(
    '#root > div.custom-modal-container.undefined > div > div.custom-modal-inner.fixed-mobile > button',
  );
};

export const hasSentTitle = async (
  element: ElementHandle<HTMLAnchorElement>,
  sentPosts: Item[],
) => {
  const titleElement = await element.$('.top_content div div div');
  const title = await titleElement.evaluate((el) => el.textContent);
  return !!sentPosts.find((el) => el.title === title);
};

export const isActualDate = async (
  element: ElementHandle<HTMLAnchorElement>,
) => {
  const timeElement = await element.$('.bot_content div div');
  return await timeElement.evaluate((el) => {
    const regex = /(\d{2}\.\d{2}\.\d{4})/; // Регулярное выражение для поиска даты в формате dd.mm.yyyy
    const match = el.innerText.match(regex); // Поиск соответствия регулярному выражению
    return match ? match[0] : null; // Возвращаем найденную дату или null, если ничего не найдено
  });
};

export const scanElements = async (newPage: Page): Promise<IScanElement> => {
  const phoneElement = await newPage.$(
    '.shadow-filter-options-all a[href^="tel"]',
  );
  const phone = await newPage.evaluate((el) => el.href, phoneElement);

  const titleElement = await newPage.$(
    'div.mb-16px.text-overflow-ellipses-3-line.font-size-md-24.font-size-16.font-TBCX-bold',
  );
  const title = await newPage.evaluate((el) => el.innerText, titleElement);

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

  const priceElement = await newPage.$('.shadow-filter-options-all span');
  const price = await newPage.evaluate((el) => el.innerHTML, priceElement);

  const dateElement = await newPage.$('.mb-24px.font-TBCX-medium.font-size-12');
  const date = await newPage.evaluate(
    (el) => (el.children[1] as HTMLElement).innerText,
    dateElement,
  );

  const idElement = await newPage.$('.mb-24px.font-TBCX-medium.font-size-12');
  const id = await newPage.evaluate(
    (el) => (el.children[2] as HTMLElement).innerText,
    idElement,
  );

  return {
    phone,
    title,
    description,
    images,
    price,
    date,
    id,
  };
};

export const isElementInSentPosts = (
  element: IScanElement,
  sentPosts: Item[],
) => {
  return !!sentPosts.find(
    ({ title, id }) => title === element.title && id === element.id,
  );
};
