export function expectedScore(self: number, opp: number): number {
  return 1 / (1 + Math.pow(10, (opp - self) / 400));
}

/** Returns [newWhite, newBlack]. `result` is from white's POV: 1, 0.5, 0. */
export function updateElo(
  whiteRating: number,
  blackRating: number,
  result: 0 | 0.5 | 1,
  k = 32,
): [number, number] {
  const expW = expectedScore(whiteRating, blackRating);
  const expB = 1 - expW;
  const newWhite = Math.max(100, Math.round(whiteRating + k * (result - expW)));
  const newBlack = Math.max(100, Math.round(blackRating + k * ((1 - result) - expB)));
  return [newWhite, newBlack];
}
