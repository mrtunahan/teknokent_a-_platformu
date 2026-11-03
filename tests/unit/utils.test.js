const { isValidVkn } = require('../../src/utils/taxNumber');
const { textSimilarity, tokenize } = require('../../src/services/text');
const { slugify } = require('../../src/utils/slug');
const { makeVkn } = require('../../scripts/seed');

test('VKN doğrulama', () => {
  expect(isValidVkn(makeVkn(123456789))).toBe(true);
  expect(isValidVkn('123')).toBe(false);
  expect(isValidVkn('abcdefghij')).toBe(false);
  const v = makeVkn(555555555);
  const wrong = v.slice(0, 9) + ((Number(v[9]) + 1) % 10);
  expect(isValidVkn(wrong)).toBe(false);
});

test('Türkçe metin benzerliği', () => {
  expect(tokenize('Görüntü İşleme ve Kalite')).toEqual(['gorunt', 'isleme', 'kalite']);
  const a = 'endüstriyel kalite kontrol için hata tespiti';
  expect(textSimilarity(a, 'kalite kontrolünde hata tespit modeli')).toBeGreaterThan(textSimilarity(a, 'mobil oyun geliştirme'));
  expect(textSimilarity('', 'x')).toBe(0);
});

test('slugify', () => {
  expect(slugify('Proje Yazımı (TÜBİTAK / KOSGEB / AB)')).toBe('proje-yazimi-tubitak-kosgeb-ab');
});
