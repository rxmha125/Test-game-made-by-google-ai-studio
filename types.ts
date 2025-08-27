/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
export type Player = 'X' | 'O' | null;

// FIX: Add PlaybackState type used by multiple components.
export type PlaybackState = 'playing' | 'paused' | 'stopped' | 'loading';

// FIX: Add Prompt type used by multiple components.
export interface Prompt {
  promptId: string;
  text: string;
  weight: number;
  cc: number;
  color: string;
}

// FIX: Add ControlChange type used by multiple components.
export interface ControlChange {
  channel: number;
  cc: number;
  value: number;
}

export type GameMode = 'classic' | 'gravity';
export type Opponent = 'player' | 'ai';
