'use client';

// Tiny Web Audio synth — no external sound files. Generates short tones for
// move/capture/check/end. Loads lazily to avoid SSR/Audio issues.

type Kind = 'move' | 'capture' | 'check' | 'end';

let ctx: AudioContext | null = null;
let enabled = true;

const STORAGE_KEY = 'chess.sound';

export function initSound() {
  if (typeof window === 'undefined') return;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === '0') enabled = false;
}

export function isSoundEnabled() {
  return enabled;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  }
}

function getCtx(): AudioContext | null {
  if (!enabled) return null;
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const W = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const Impl = window.AudioContext || W.webkitAudioContext;
    if (!Impl) return null;
    ctx = new Impl();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
  return ctx;
}

function tone(freq: number, durMs: number, volume = 0.08, type: OscillatorType = 'sine', slideTo?: number) {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + durMs / 1000);
  gain.gain.setValueAtTime(0, ac.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ac.currentTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + durMs / 1000);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + durMs / 1000 + 0.05);
}

export function playSound(kind: Kind) {
  if (!enabled) return;
  switch (kind) {
    case 'move':
      tone(540, 70, 0.05, 'triangle');
      break;
    case 'capture':
      tone(260, 110, 0.09, 'square', 160);
      break;
    case 'check':
      tone(880, 90, 0.08, 'sawtooth');
      setTimeout(() => tone(660, 120, 0.07, 'sawtooth'), 90);
      break;
    case 'end':
      tone(520, 160, 0.08, 'triangle');
      setTimeout(() => tone(780, 220, 0.09, 'triangle'), 140);
      break;
  }
}
