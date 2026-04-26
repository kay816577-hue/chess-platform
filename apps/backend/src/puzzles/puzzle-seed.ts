export interface SeedPuzzle {
  id: string;
  fen: string;
  solution: string; // UCI moves separated by spaces; first move is the opponent's,
                    // then the solver's correct move(s), alternating.
  rating: number;
  themes: string; // comma-separated
}

// A curated mix of classic mate-in-N and tactical motifs. These are all
// reached from standard positions; FEN is the position just before the
// opponent's first move in the solution.
export const SEED_PUZZLES: SeedPuzzle[] = [
  {
    id: 'p_mate_in_one_back_rank',
    fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
    solution: 'a1a8',
    rating: 600,
    themes: 'mateIn1,backRankMate,endgame',
  },
  {
    id: 'p_scholars_mate_defense',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
    solution: 'g8f6',
    rating: 700,
    themes: 'opening,defense',
  },
  {
    id: 'p_fork_knight_1',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    solution: 'f3e5 c6e5 d2d4',
    rating: 900,
    themes: 'fork,knight,centerBreak',
  },
  {
    id: 'p_pin_bishop_1',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5',
    solution: 'c1g5',
    rating: 1000,
    themes: 'pin,bishop',
  },
  {
    id: 'p_mate_in_two_smothered',
    fen: '6rk/6pp/8/6N1/8/7Q/5PPP/6K1 w - - 0 1',
    solution: 'h3h7 g8h7 g5f7',
    rating: 1400,
    themes: 'mateIn2,smotheredMate,sacrifice',
  },
  {
    id: 'p_skewer_queen_king',
    fen: '4k3/8/8/8/4Q3/8/4K3/4r3 w - - 0 1',
    solution: 'e4e8 e8e2',
    rating: 1100,
    themes: 'skewer,queen,endgame',
  },
  {
    id: 'p_discovered_check_1',
    fen: 'r3k2r/pp3ppp/2n1b3/q1Pp4/3P4/P1N2N2/1B3PPP/R2Q1RK1 w kq - 0 13',
    solution: 'c3d5 e6d5 c5c6',
    rating: 1500,
    themes: 'discoveredAttack,passedPawn',
  },
  {
    id: 'p_opera_morphy',
    fen: '4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 1 17',
    solution: 'b3b8 d7b8 d1d8',
    rating: 1800,
    themes: 'mateIn2,classic,sacrifice',
  },
  {
    id: 'p_windmill_torre',
    fen: '3r2k1/5pp1/p3p1p1/1p1p3r/3P4/P1P2N1P/1P3PP1/R4RK1 b - - 0 1',
    solution: 'h5h3 g2h3 d8d4',
    rating: 1700,
    themes: 'zugzwang,longRange',
  },
  {
    id: 'p_bishop_battery_1',
    fen: 'r1bq1rk1/pp3ppp/2n1pn2/3p4/1bPP4/2NBPN2/PP3PPP/R1BQ1RK1 w - - 4 8',
    solution: 'd3h7 g8h7 f3g5',
    rating: 1600,
    themes: 'sacrifice,classic,kingSide',
  },
  {
    id: 'p_queen_trap_1',
    fen: 'r1bq1rk1/ppp2ppp/2np1n2/2b1p3/2B1P3/3P1N2/PPP1NPPP/R1BQ1RK1 w - - 0 7',
    solution: 'c1g5 c5b4 g5f6',
    rating: 1300,
    themes: 'pin,pawnGrab',
  },
  {
    id: 'p_rook_lift_attack',
    fen: '2r3k1/pp3ppp/2n1p3/3pP3/1b1P4/2N2N2/PP3PPP/R2QK2R w KQ - 0 13',
    solution: 'h1h4 c8e8 h4h7',
    rating: 1500,
    themes: 'attack,rookLift',
  },
];
