import { isElementInSentPosts } from './functions';
import { IScanElement } from './models/item.interface';

const element: IScanElement = {
  phone: '12345',
  title: 'title',
  description: 'description',
  images: ['image'],
  price: 'price',
  date: 'date',
  id: 'id',
};
const sentPosts = [element];

describe('Parser tests ', () => {
  it('return true when element in sentPosts', () => {
    expect(isElementInSentPosts(element, sentPosts)).toBe(true);
  });
  it('return false when element not in sentPosts', () => {
    expect(isElementInSentPosts(element, [])).toBe(false);
  });
});
