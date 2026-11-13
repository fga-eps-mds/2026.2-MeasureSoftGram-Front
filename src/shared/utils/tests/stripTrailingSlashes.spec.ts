import { stripTrailingSlashes } from '../stripTrailingSlashes';

describe('stripTrailingSlashes', () => {
  it.each([
    ['/home/', '/home'],
    ['/home///', '/home'],
    ['/home', '/home'],
    ['/a/b/', '/a/b'],
    ['http://service:8080/api/', 'http://service:8080/api'],
    ['/', ''],
    ['///', ''],
    ['', '']
  ])('%s -> %s', (input, expected) => {
    expect(stripTrailingSlashes(input)).toBe(expected);
  });
});
