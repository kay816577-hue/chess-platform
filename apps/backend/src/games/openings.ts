// Tiny ECO-style opening classifier. Keys are space-separated SAN move lists
// and we pick the deepest match.

const TABLE: Record<string, { eco: string; name: string }> = {
  'e4': { eco: 'B00', name: "King's Pawn" },
  'e4 e5': { eco: 'C20', name: "King's Pawn Game" },
  'e4 e5 Nf3': { eco: 'C40', name: "King's Knight Opening" },
  'e4 e5 Nf3 Nc6': { eco: 'C44', name: 'Open Game' },
  'e4 e5 Nf3 Nc6 Bb5': { eco: 'C60', name: 'Ruy López' },
  'e4 e5 Nf3 Nc6 Bc4': { eco: 'C50', name: 'Italian Game' },
  'e4 e5 Nf3 Nc6 Bc4 Bc5': { eco: 'C53', name: 'Giuoco Piano' },
  'e4 e5 Nf3 Nf6': { eco: 'C42', name: 'Petroff Defense' },
  'e4 c5': { eco: 'B20', name: 'Sicilian Defense' },
  'e4 c5 Nf3 d6': { eco: 'B50', name: 'Sicilian, Open' },
  'e4 c5 Nf3 Nc6': { eco: 'B30', name: "Sicilian, Old" },
  'e4 e6': { eco: 'C00', name: 'French Defense' },
  'e4 c6': { eco: 'B10', name: 'Caro-Kann Defense' },
  'e4 d5': { eco: 'B01', name: 'Scandinavian Defense' },
  'e4 d6': { eco: 'B07', name: 'Pirc Defense' },
  'e4 Nf6': { eco: 'B02', name: "Alekhine's Defense" },
  'd4': { eco: 'A40', name: "Queen's Pawn" },
  'd4 d5': { eco: 'D00', name: "Queen's Pawn Game" },
  'd4 d5 c4': { eco: 'D06', name: "Queen's Gambit" },
  'd4 d5 c4 c6': { eco: 'D10', name: 'Slav Defense' },
  'd4 d5 c4 e6': { eco: 'D30', name: "Queen's Gambit Declined" },
  'd4 Nf6': { eco: 'A45', name: 'Indian Defense' },
  'd4 Nf6 c4': { eco: 'E00', name: 'Indian, c4' },
  'd4 Nf6 c4 g6': { eco: 'E60', name: "King's Indian Defense" },
  'd4 Nf6 c4 e6': { eco: 'E20', name: 'Nimzo-Indian Defense' },
  'd4 f5': { eco: 'A80', name: 'Dutch Defense' },
  'c4': { eco: 'A10', name: 'English Opening' },
  'Nf3': { eco: 'A04', name: 'Réti Opening' },
  'g3': { eco: 'A00', name: 'Benko Opening' },
  'b3': { eco: 'A01', name: 'Nimzowitsch–Larsen Attack' },
  'f4': { eco: 'A02', name: "Bird's Opening" },
};

export function classifyOpening(sanHistory: string[]): { eco: string; name: string } | null {
  const limit = Math.min(12, sanHistory.length);
  for (let n = limit; n >= 1; n--) {
    const key = sanHistory.slice(0, n).join(' ');
    const hit = TABLE[key];
    if (hit) return hit;
  }
  return null;
}
