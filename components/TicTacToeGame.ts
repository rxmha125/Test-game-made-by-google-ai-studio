/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement, svg } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import type { Player } from '../types';

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6], // diagonals
];

const colorThemes = [
  { // Default
    '--background-color': '#1a2a33',
    '--grid-color': '#10212a',
    '--x-color': '#31c3bd',
    '--o-color': '#f2b137',
    '--text-color': '#a8bec9',
    '--win-color': '#f2b137',
  },
  { // Sunset
    '--background-color': '#2c2138',
    '--grid-color': '#1e1526',
    '--x-color': '#f88c7f',
    '--o-color': '#f2b137',
    '--text-color': '#d8c7e3',
    '--win-color': '#f88c7f',
  },
  { // Forest
    '--background-color': '#2a3d33',
    '--grid-color': '#1d2a23',
    '--x-color': '#a1c181',
    '--o-color': '#fcca46',
    '--text-color': '#e0e0d6',
    '--win-color': '#a1c181',
  },
  { // Classic
    '--background-color': '#eaeaea',
    '--grid-color': '#d4d4d4',
    '--x-color': '#e53935',
    '--o-color': '#1e88e5',
    '--text-color': '#333333',
    '--win-color': '#e53935',
  }
];

type LineCoords = { x1: string, y1: string, x2: string, y2: string };

@customElement('tic-tac-toe-game')
// FIX: The class must extend LitElement to be a web component.
export class TicTacToeGame extends LitElement {
  @state() private board: Player[] = Array(9).fill(null);
  @state() private currentPlayer: 'X' | 'O' = 'X';
  @state() private winner: 'X' | 'O' | null = null;
  @state() private winningCombination: number[] | null = null;
  @state() private isDraw = false;
  @state() private winningLineCoords: LineCoords | null = null;
  @state() private currentThemeIndex = 0;
  @state() private audioContext: AudioContext | null = null;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2rem;
      --transition-speed: 0.3s;
      transition: color var(--transition-speed) ease, background-color var(--transition-speed) ease;
    }

    h1 {
      font-family: 'Fredoka One', cursive;
      font-size: clamp(2rem, 10vw, 3.5rem);
      color: var(--text-color);
      margin: 0;
      text-shadow: 2px 2px 0 var(--grid-color);
      transition: all var(--transition-speed) ease;
    }

    .status {
      font-size: clamp(1.2rem, 5vw, 1.8rem);
      font-weight: bold;
      height: 2rem;
      color: var(--text-color);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color var(--transition-speed) ease;
    }

    .status .player {
      font-weight: bolder;
      display: inline-block;
      margin: 0 0.5ch;
      transform: scale(1.2);
      transition: color var(--transition-speed) ease;
    }
    .status .player.x { color: var(--x-color); }
    .status .player.o { color: var(--o-color); }

    .board-container {
      position: relative;
    }

    .board {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      width: var(--board-size, 500px);
      height: var(--board-size, 500px);
      gap: 1rem;
      background-color: var(--grid-color, #10212a);
      padding: 1rem;
      border-radius: 10px;
      box-shadow: 0 8px 0 rgba(0, 0, 0, 0.2);
      transition: background-color var(--transition-speed) ease;
    }

    .cell {
      background-color: var(--background-color, #1a2a33);
      border: none;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: 'Fredoka One', cursive;
      font-size: calc(var(--cell-size, 160px) * 0.6);
      font-weight: bold;
      transition: all var(--transition-speed) ease;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }

    .cell:hover:not(.x):not(.o) {
      background-color: color-mix(in srgb, var(--background-color) 80%, white);
    }

    .cell.x {
      color: var(--x-color, #31c3bd);
    }

    .cell.o {
      color: var(--o-color, #f2b137);
    }

    .cell.win {
      background-color: var(--grid-color, #10212a);
    }

    .restart-button {
      background-color: var(--o-color, #f2b137);
      color: var(--background-color, #1a2a33);
      border: none;
      border-radius: 8px;
      padding: 0.8rem 1.6rem;
      font-size: 1.2rem;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 0 color-mix(in srgb, var(--o-color) 70%, black);
      transition: all var(--transition-speed) ease;
      text-transform: uppercase;
    }

    .restart-button:hover {
      background-color: color-mix(in srgb, var(--o-color) 85%, white);
    }

    .restart-button:active {
      transform: translateY(2px);
      box-shadow: 0 2px 0 color-mix(in srgb, var(--o-color) 70%, black);
    }

    .line-svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .winning-line {
      stroke: var(--win-color);
      stroke-width: 10;
      stroke-linecap: round;
      stroke-dasharray: 150;
      stroke-dashoffset: 150;
      transition: stroke-dashoffset 0.5s 0.2s ease-in-out, stroke var(--transition-speed) ease;
      filter: drop-shadow(0 0 5px var(--win-color));
    }

    .winning-line.visible {
      stroke-dashoffset: 0;
    }
  `;

  override firstUpdated() {
    this.applyTheme();
  }
  
  private applyTheme() {
    const theme = colorThemes[this.currentThemeIndex];
    for (const [key, value] of Object.entries(theme)) {
      document.documentElement.style.setProperty(key, value);
    }
  }

  // --- Audio Methods ---

  private initAudio() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private playSound(notes: { freq: number, duration: number, delay: number }[], type: OscillatorType = 'sine') {
    if (!this.audioContext || this.audioContext.state === 'suspended') {
      this.audioContext?.resume();
    }
    if (!this.audioContext) return;
    
    const now = this.audioContext.currentTime;

    notes.forEach(note => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(note.freq, now + note.delay);

      gainNode.gain.setValueAtTime(0.3, now + note.delay);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.duration);

      oscillator.start(now + note.delay);
      oscillator.stop(now + note.delay + note.duration);
    });
  }

  private playClickSound(player: 'X' | 'O') {
    const freq = player === 'X' ? 880 : 660;
    this.playSound([{ freq, duration: 0.1, delay: 0 }], 'triangle');
  }

  private playWinSound() {
    this.playSound([
      { freq: 523.25, duration: 0.1, delay: 0 }, // C5
      { freq: 659.25, duration: 0.1, delay: 0.1 }, // E5
      { freq: 783.99, duration: 0.1, delay: 0.2 }, // G5
      { freq: 1046.50, duration: 0.15, delay: 0.3 }, // C6
    ]);
  }

  private playDrawSound() {
    this.playSound([
      { freq: 349.23, duration: 0.1, delay: 0 }, // F4
      { freq: 261.63, duration: 0.15, delay: 0.15 }, // C4
    ]);
  }

  private playRestartSound() {
    this.playSound([{ freq: 440, duration: 0.05, delay: 0 }, { freq: 880, duration: 0.1, delay: 0.05 }]);
  }

  // --- Game Logic ---

  private handleCellClick(index: number) {
    this.initAudio(); // Initialize on first user interaction

    if (this.board[index] || this.winner) {
      return;
    }
    
    this.playClickSound(this.currentPlayer);

    const newBoard = [...this.board];
    newBoard[index] = this.currentPlayer;
    this.board = newBoard;

    this.checkGameState();
  }

  private checkGameState() {
    for (const combination of WINNING_COMBINATIONS) {
      const [a, b, c] = combination;
      if (
        this.board[a] &&
        this.board[a] === this.board[b] &&
        this.board[a] === this.board[c]
      ) {
        this.winner = this.board[a] as 'X' | 'O';
        this.winningCombination = combination;
        this.setWinningLine(combination);
        this.playWinSound();
        return;
      }
    }

    if (this.board.every((cell) => cell)) {
      this.isDraw = true;
      this.playDrawSound();
    } else {
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }
  }

  private restartGame() {
    this.initAudio();
    this.playRestartSound();
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.winner = null;
    this.winningCombination = null;
    this.isDraw = false;
    this.winningLineCoords = null;
    this.currentThemeIndex = (this.currentThemeIndex + 1) % colorThemes.length;
    this.applyTheme();
  }

  private setWinningLine(combination: number[]) {
    const [start, , end] = combination;
    const pos = ['16.66%', '50%', '83.33%'];
    const startX = pos[start % 3];
    const startY = pos[Math.floor(start / 3)];
    const endX = pos[end % 3];
    const endY = pos[Math.floor(end / 3)];

    const [a, b] = [
      { x: parseFloat(startX), y: parseFloat(startY) },
      { x: parseFloat(endX), y: parseFloat(endY) },
    ].sort((p1, p2) => p1.x - p2.x || p1.y - p2.y);

    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const extension = 10;

    const extendedA = {
      x: a.x - Math.cos(angle) * extension,
      y: a.y - Math.sin(angle) * extension,
    };
    const extendedB = {
      x: b.x + Math.cos(angle) * extension,
      y: b.y + Math.sin(angle) * extension,
    };

    this.winningLineCoords = {
      x1: `${extendedA.x}%`, y1: `${extendedA.y}%`,
      x2: `${extendedB.x}%`, y2: `${extendedB.y}%`,
    };
  }

  private renderStatus() {
    if (this.winner) {
      return html`<span class="player ${this.winner.toLowerCase()}">${this.winner}</span> WINS!`;
    }
    if (this.isDraw) {
      return html`IT'S A DRAW!`;
    }
    return html`IT'S <span class="player ${this.currentPlayer.toLowerCase()}">${this.currentPlayer}</span>'S TURN`;
  }

  override render() {
    return html`
      <h1>Tic-Tac-Toe</h1>
      <div class="status">${this.renderStatus()}</div>
      <div class="board-container">
        <div class="board">
          ${this.board.map((cell, index) => {
            const isWinningCell = this.winningCombination?.includes(index);
            const classes = {
              cell: true,
              x: cell === 'X',
              o: cell === 'O',
              win: !!isWinningCell,
            };
            return html`
              <button
                class=${classMap(classes)}
                @click=${() => this.handleCellClick(index)}
                ?disabled=${!!cell || !!this.winner}
                aria-label="Cell ${index + 1}, ${cell ? 'filled with ' + cell : 'empty'}"
              >
                ${cell}
              </button>
            `;
          })}
        </div>
        ${this.renderWinningLine()}
      </div>
      <button class="restart-button" @click=${this.restartGame}>Restart Game</button>
    `;
  }
  
  private renderWinningLine() {
    if (!this.winningLineCoords) return null;
    return svg`
      <svg class="line-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line
          class="winning-line ${this.winner ? 'visible' : ''}"
          x1=${this.winningLineCoords.x1}
          y1=${this.winningLineCoords.y1}
          x2=${this.winningLineCoords.x2}
          y2=${this.winningLineCoords.y2}
        />
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tic-tac-toe-game': TicTacToeGame;
  }
}