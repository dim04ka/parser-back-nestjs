function sum(a: number, b: number) {
  return a + b;
}

// write here test for it
describe('TelegramBotService', () => {
  it('should be defined', () => {
    expect(sum(1, 2)).toBe(4);
  });
});
