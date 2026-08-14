import type { SyntheticEvent } from 'react';

export interface Member {
  id: string;
  name: string;
  photo?: string | null;
}

export interface ResultEntry {
  name: string;
  time: number;
}

export type WinnerDisplayMode = 'popup' | 'wheel';
export type ConfettiEffect =
  | 'none' | 'paper' | 'classic' | 'shapes' | 'stars' | 'hearts' | 'fireworks' | 'cannons';
export type PointerStyle = 'classic' | 'diamond' | 'wedge';
export type SpinDirection = 'cw' | 'ccw';
export type FontFormat = 'normal' | 'bold' | 'italic';

export interface WheelState {
  members: Member[];
  winnerId: string | null;
  spinTime: number;
  spinSlowly: boolean;
  blindMode: boolean;
  matchPointerColor: boolean;
  maxDisplayed: number;
  autoRemoveWinner: boolean;
  autoSwitchResults: boolean;
  winnerDisplayMode: WinnerDisplayMode;
  confettiEffect: ConfettiEffect;
  spinSound: string;
  spinVol: number;
  customSoundData: string | null;
  winSound: string;
  winVol: number;
  pointerVibration: boolean;
  pointerStyle: PointerStyle;
  spinDirection: SpinDirection;
  fontSize: number;
  fontFormat: FontFormat;
  fontColor: string;
  results: ResultEntry[];
  spinToken: number;
}

export const PALETTE = ['#5e8298', '#aa8ca4', '#86b5bf', '#e0b7c7', '#786883', '#c1a5ce', '#9fced4', '#15999e'];
export const DEFAULT_PHOTO = '/Logo Transparent Clean.png';

// A freshly-uploaded Storage photo can briefly 404 before it's fully available.
// Retry a few times before giving up and falling back to the default photo,
// instead of permanently hiding a valid photo on the first transient failure.
export function handleImgError(e: SyntheticEvent<HTMLImageElement>, realSrc: string) {
  const img = e.currentTarget;
  const tries = Number(img.dataset.tries || '0');
  if (tries < 3) {
    img.dataset.tries = String(tries + 1);
    setTimeout(() => { img.src = realSrc; }, 700);
  } else {
    img.src = DEFAULT_PHOTO;
  }
}

export function defaultState(): WheelState {
  return {
    members: [],
    winnerId: null,
    spinTime: 6,
    spinSlowly: false,
    blindMode: false,
    matchPointerColor: false,
    maxDisplayed: 100,
    autoRemoveWinner: false,
    autoSwitchResults: false,
    winnerDisplayMode: 'popup',
    confettiEffect: 'shapes',
    spinSound: 'tick',
    spinVol: 0.25,
    customSoundData: null,
    winSound: 'twinkle',
    winVol: 0.8,
    pointerVibration: true,
    pointerStyle: 'classic',
    spinDirection: 'cw',
    fontSize: 15,
    fontFormat: 'normal',
    fontColor: '#ffffff',
    results: [],
    spinToken: 0,
  };
}

export function getDisplayMembers(state: WheelState): Member[] {
  const m = state.members;
  if (m.length <= state.maxDisplayed) return m;
  const winnerIdx = m.findIndex((x) => x.id === state.winnerId);
  const rest = m.filter((_, i) => i !== winnerIdx).slice(0, Math.max(0, state.maxDisplayed - 1));
  const win = winnerIdx >= 0 ? [m[winnerIdx]] : [];
  return [...win, ...rest];
}

export function fmtPct(n: number): string {
  return (100 / Math.max(1, n)).toFixed(n > 20 ? 1 : 0) + '%';
}
