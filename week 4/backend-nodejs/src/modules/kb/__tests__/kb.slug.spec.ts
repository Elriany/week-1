import { describe, it, expect } from 'vitest';
import { slugify } from '../kb.service';

describe('slugify', () => {
  it('"Getting Started With AZM" becomes getting-started-with-azm', () => {
    expect(slugify('Getting Started With AZM')).toBe('getting-started-with-azm');
  });

  it('collapses punctuation and repeated separators to single hyphens, no leading/trailing hyphen', () => {
    expect(slugify('Hello,   World!! -- Test')).toBe('hello-world-test');
  });

  it('truncates a 400-character title to 200', () => {
    const title = 'a'.repeat(400);
    expect(slugify(title).length).toBe(200);
  });

  it('a title of only punctuation produces a non-empty slug', () => {
    expect(slugify('!!!???...').length).toBeGreaterThan(0);
  });
});
