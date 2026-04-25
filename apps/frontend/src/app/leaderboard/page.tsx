import { API_URL } from '@/lib/config';

interface Row {
  id: string;
  username: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

async function getBoard(): Promise<Row[]> {
  try {
    const res = await fetch(`${API_URL}/api/users/leaderboard`, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as Row[];
  } catch {
    return [];
  }
}

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const rows = await getBoard();
  return (
    <section className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
      {rows.length === 0 ? (
        <div className="text-sm text-neutral-500">No rated games yet. Go play some games!</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-neutral-400 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Player</th>
                <th className="px-3 py-2 text-right">Rating</th>
                <th className="px-3 py-2 text-right">Record</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t border-neutral-800">
                  <td className="px-3 py-2 text-neutral-500">{i + 1}</td>
                  <td className="px-3 py-2 text-white">{r.username}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.rating}</td>
                  <td className="px-3 py-2 text-right text-neutral-400">{r.wins}W / {r.losses}L / {r.draws}D</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
