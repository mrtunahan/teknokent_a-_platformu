const { selectFeed, dampedScore } = require('../../src/services/ranking');

const seq = (n) => Array.from({ length: n }, (_, i) => ({ company: `c${i}`, score: 1 - i / n }));
const rng = (() => {
  let x = 42;
  return () => {
    x = (x * 16807) % 2147483647;
    return x / 2147483647;
  };
})();

describe('akış seçimi', () => {
  test('aday sayısı limitten azsa hepsi döner', () => {
    expect(selectFeed(seq(5), 20)).toHaveLength(5);
  });

  test('~%80 en yüksek skor, ~%20 orta aralıktan keşif', () => {
    const out = selectFeed(seq(200), 20, { explorationRatio: 0.2, rng });
    expect(out).toHaveLength(20);
    const explore = out.filter((c) => c.exploration);
    expect(explore).toHaveLength(4);
    const top = out.filter((c) => !c.exploration).map((c) => c.company);
    expect(top).toEqual(seq(16).map((c) => c.company));
    // Keşif kartları kalan adayların orta diliminden (%25–%75) gelir
    for (const c of explore) {
      const idx = Number(c.company.slice(1)) - 16;
      expect(idx).toBeGreaterThanOrEqual(Math.floor(184 * 0.25));
      expect(idx).toBeLessThan(Math.ceil(184 * 0.75));
    }
    expect(new Set(out.map((c) => c.company)).size).toBe(20);
  });

  test('popüler firmalar sönümlenir', () => {
    expect(dampedScore(0.8, 0)).toBe(0.8);
    expect(dampedScore(0.8, 100)).toBeLessThan(0.8);
    const impressions = new Map([['c0', 1000]]);
    const out = selectFeed(seq(50), 5, { explorationRatio: 0, impressions });
    expect(out[0].company).not.toBe('c0');
  });

  test('n=0 boş döner', () => {
    expect(selectFeed(seq(10), 0)).toEqual([]);
  });
});
