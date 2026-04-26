'use client';

import { useEffect, useState } from 'react';
import { BOARD_THEMES, getBoardTheme, setBoardTheme } from '@/lib/theme';

export function ThemePicker() {
  const [current, setCurrent] = useState(BOARD_THEMES[0].name);

  useEffect(() => { setCurrent(getBoardTheme().name); }, []);

  return (
    <div className="flex flex-wrap gap-2">
      {BOARD_THEMES.map((t) => {
        const active = t.name === current;
        return (
          <button
            key={t.name}
            onClick={() => { setBoardTheme(t.name); setCurrent(t.name); }}
            className={`rounded px-2 py-1 text-xs border ${active ? 'border-brand text-white' : 'border-neutral-700 text-neutral-300 hover:border-neutral-500'}`}
            title={t.name}
          >
            <span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: t.light, border: `1px solid ${t.dark}` }} />
            <span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ background: t.dark }} />
            {t.name}
          </button>
        );
      })}
    </div>
  );
}
