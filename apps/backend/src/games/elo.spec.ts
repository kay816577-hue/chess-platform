import { updateElo, expectedScore } from './elo';

describe('elo', () => {
  it('expected score is 0.5 for equal ratings', () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 3);
  });

  it('white wins against equal opponent -> rating goes up', () => {
    const [w, b] = updateElo(1500, 1500, 1);
    expect(w).toBeGreaterThan(1500);
    expect(b).toBeLessThan(1500);
    expect(w - 1500).toBe(1500 - b);
  });

  it('draw between equal opponents -> no change', () => {
    const [w, b] = updateElo(1500, 1500, 0.5);
    expect(w).toBe(1500);
    expect(b).toBe(1500);
  });

  it('floors at 100', () => {
    const [w] = updateElo(110, 2500, 0);
    expect(w).toBeGreaterThanOrEqual(100);
  });
});
