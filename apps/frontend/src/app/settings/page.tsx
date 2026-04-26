'use client';

import { useEffect, useState } from 'react';
import { ThemePicker } from '@/components/ThemePicker';
import { isSoundEnabled, setSoundEnabled, initSound } from '@/lib/sound';

export default function SettingsPage() {
  const [sound, setSound] = useState(true);

  useEffect(() => { initSound(); setSound(isSoundEnabled()); }, []);

  return (
    <section className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>
      <div className="card space-y-3">
        <div className="font-medium text-white">Board theme</div>
        <ThemePicker />
      </div>
      <div className="card space-y-3">
        <div className="font-medium text-white">Sound</div>
        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={sound}
            onChange={(e) => { setSoundEnabled(e.target.checked); setSound(e.target.checked); }}
          /> Play move / capture / check sounds
        </label>
        <p className="text-xs text-neutral-500">You can also press <kbd className="px-1 rounded bg-neutral-800">M</kbd> in a game to toggle.</p>
      </div>
      <div className="card space-y-2">
        <div className="font-medium text-white">Keyboard shortcuts</div>
        <ul className="text-sm text-neutral-300 space-y-1">
          <li><kbd className="px-1 rounded bg-neutral-800">F</kbd> — flip board</li>
          <li><kbd className="px-1 rounded bg-neutral-800">R</kbd> — resign</li>
          <li><kbd className="px-1 rounded bg-neutral-800">D</kbd> — offer draw</li>
          <li><kbd className="px-1 rounded bg-neutral-800">M</kbd> — toggle sound</li>
        </ul>
      </div>
    </section>
  );
}
