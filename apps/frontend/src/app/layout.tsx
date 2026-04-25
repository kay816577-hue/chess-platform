import '../styles/globals.css';
import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'Chess Platform',
  description: 'Open-source chess platform. Play online, vs AI, and analyze your games.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-8 text-sm text-neutral-500">
          Powered by Stockfish + Next.js + NestJS. Open source chess for everyone.
        </footer>
      </body>
    </html>
  );
}
