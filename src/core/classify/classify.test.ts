import { classify, inferKind, normalizeTitle } from './classify';

describe('section isolation classifier', () => {
  test('routes anime only to anime', () => {
    expect(classify({ title: 'One Piece anime' })).toBe('anime');
  });
  test('routes K-Drama only to kdrama', () => {
    expect(classify({ title: 'Korean Drama episode 1' })).toBe('kdrama');
  });
  test('routes regional content to others', () => {
    expect(classify({ title: 'Bangla movie 2025' })).toBe('others');
  });
  test('adult marker wins over generic words', () => {
    expect(classify({ title: 'Adult anime' })).toBe('adult');
  });
  test('declared adapter section is authoritative', () => {
    expect(classify({ title: 'Anime movie', declared: 'home' })).toBe('home');
  });
  test('normalizes title for deduplication', () => {
    expect(normalizeTitle('The Matrix (2024) [1080p]')).toBe('matrix');
  });
  test('infers series kind', () => {
    expect(inferKind({ title: 'Example S02E03' }, 'home')).toBe('series');
  });
});
