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
  @state() private winningLineLength = 0;
  @state() private audioContext: AudioContext | null = null;
  @state() private isGlassMode = false;

  static override styles = css`
    :host {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100vw;
      height: 100vh;
      background-color: var(--background-color);
      --transition-speed: 0.3s;
      transition: background 0.5s ease;
      --board-size: 60vmin;
      --cell-size: calc(var(--board-size) / 3);
    }
    
    .game-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2vmin;
    }

    h1 {
      font-family: 'Fredoka One', cursive;
      font-size: clamp(2rem, 7vmin, 3.5rem);
      color: var(--text-color);
      margin: 0;
      text-shadow: 2px 2px 0 var(--grid-color);
      transition: all var(--transition-speed) ease;
    }

    .status {
      font-size: clamp(1.2rem, 3.5vmin, 1.8rem);
      font-weight: bold;
      padding: 1vmin 0;
      color: var(--text-color);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color var(--transition-speed) ease, transform 0.3s ease-in-out;
    }

    .game-wrapper.game-over .status {
      transform: scale(1.1);
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
      width: var(--board-size);
      height: var(--board-size);
      gap: 1.5vmin;
      background-color: var(--grid-color, #10212a);
      padding: 1.5vmin;
      border-radius: 10px;
      box-shadow: 0 8px 0 rgba(0, 0, 0, 0.2);
      transition: all var(--transition-speed) ease;
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
      font-size: calc(var(--cell-size) * 0.6);
      font-weight: bold;
      transition: all var(--transition-speed) ease;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }
    
    .game-wrapper.game-over .cell:not(.win) {
      opacity: 0.5;
    }
    
    .game-wrapper.game-over .cell {
      cursor: not-allowed;
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

    @keyframes glow {
      0% {
        box-shadow: 0 0 8px -4px var(--glow-color);
        background-color: var(--background-color);
      }
      50% {
        box-shadow: 0 0 20px 5px var(--glow-color);
        background-color: color-mix(in srgb, var(--background-color) 80%, var(--glow-color));
      }
      100% {
        box-shadow: 0 0 8px -4px var(--glow-color);
        background-color: var(--background-color);
      }
    }

    .cell.win {
      animation: glow 2.5s infinite ease-in-out;
    }

    .cell.win.x {
      --glow-color: var(--x-color);
    }
    .cell.win.o {
      --glow-color: var(--o-color);
    }

    .restart-button {
      background-color: var(--o-color, #f2b137);
      color: var(--background-color, #1a2a33);
      border: none;
      border-radius: 8px;
      padding: 1.5vmin 3vmin;
      font-size: clamp(1rem, 2.5vmin, 1.2rem);
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
      stroke-dasharray: var(--line-length, 0);
      stroke-dashoffset: var(--line-length, 0);
      transition: stroke-dashoffset 0.5s 0.2s ease-in-out, stroke var(--transition-speed) ease;
      filter: drop-shadow(0 0 5px var(--win-color));
    }

    .winning-line.visible {
      stroke-dashoffset: 0;
    }

    .glass-mode-toggle {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 100;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      background: rgba(0,0,0,0.1);
      transition: background 0.3s ease;
    }
    
    .glass-mode-toggle:hover {
      background: rgba(0,0,0,0.2);
    }

    .glass-mode-toggle svg {
      width: 32px;
      height: 32px;
      fill: var(--text-color);
      transition: transform 0.3s ease, fill var(--transition-speed) ease;
    }

    .glass-mode-toggle:hover svg {
      transform: scale(1.2) rotate(15deg);
    }
    
    /* --- Glass Mode Styles --- */

    @keyframes gradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    :host(.glass-mode) {
      background: linear-gradient(-45deg, #000000, #1a1a1a, #2c2c2c, #000000);
      background-size: 400% 400%;
      animation: gradient 15s ease infinite;
    }

    :host(.glass-mode) .board {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    }
    
    :host(.glass-mode) .cell {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    :host(.glass-mode) .cell:hover:not(.x):not(.o) {
      background: rgba(255, 255, 255, 0.15);
      box-shadow: inset 0 0 0 2px white;
    }
    
    :host(.glass-mode) h1,
    :host(.glass-mode) .status,
    :host(.glass-mode) .glass-mode-toggle svg {
      color: #fff;
      fill: #fff;
      text-shadow: 0 0 10px rgba(0,0,0,0.5);
    }
    
    :host(.glass-mode) .restart-button {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
      box-shadow: 0 4px 0 rgba(0,0,0,0.2);
    }

    :host(.glass-mode) .restart-button:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    :host(.glass-mode) .restart-button:active {
       box-shadow: 0 2px 0 rgba(0,0,0,0.2);
    }

  `;

  override connectedCallback() {
    super.connectedCallback();
    this.restartGame();
  }

  private initAudio() {
    if (!this.audioContext) {
      // FIX: Cast window to any to access vendor-prefixed webkitAudioContext for older browser compatibility.
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private playSound(type: 'click' | 'win' | 'draw' | 'restart' | 'magic') {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);

    switch (type) {
      case 'click':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(this.currentPlayer === 'X' ? 440 : 660, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
        break;
      case 'win':
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(523.25, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.4, this.audioContext.currentTime + 0.01);
        setTimeout(() => {
          oscillator.frequency.setValueAtTime(659.25, this.audioContext.currentTime);
        }, 100);
        setTimeout(() => {
          oscillator.frequency.setValueAtTime(783.99, this.audioContext.currentTime);
        }, 200);
        setTimeout(() => {
          gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
        }, 300);
        break;
      case 'draw':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
        oscillator.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.3);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);
        break;
      case 'restart':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
        oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.2);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.2);
        break;
      case 'magic':
        oscillator.type = 'sine';
        const startFreq = this.isGlassMode ? 800 : 400;
        const endFreq = this.isGlassMode ? 400 : 800;
        oscillator.frequency.setValueAtTime(startFreq, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(endFreq, this.audioContext.currentTime + 0.2);
        gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.2);
        break;
    }

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.5);
  }

  private handleCellClick(index: number) {
    this.initAudio();
    if (this.board[index] || this.winner) {
      return;
    }

    const newBoard = [...this.board];
    newBoard[index] = this.currentPlayer;
    this.board = newBoard;
    this.playSound('click');

    this.checkWinner();
    if (!this.winner) {
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }
  }

  private checkWinner() {
    for (const combination of WINNING_COMBINATIONS) {
      const [a, b, c] = combination;
      if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
        this.winner = this.board[a];
        this.winningCombination = combination;
        // Wait for next frame for elements to be available
        requestAnimationFrame(() => this.calculateWinningLine());
        this.playSound('win');
        return;
      }
    }

    if (this.board.every(cell => cell !== null)) {
      this.isDraw = true;
      this.playSound('draw');
    }
  }

  private calculateWinningLine() {
    if (!this.winningCombination) return;
    const [start, _, end] = this.winningCombination;
    const startCell = this.shadowRoot?.querySelectorAll('.cell')[start];
    const endCell = this.shadowRoot?.querySelectorAll('.cell')[end];
    const boardRect = this.shadowRoot?.querySelector('.board')?.getBoundingClientRect();

    if (startCell && endCell && boardRect) {
      const startRect = startCell.getBoundingClientRect();
      const endRect = endCell.getBoundingClientRect();

      const x1 = (startRect.left + startRect.width / 2) - boardRect.left;
      const y1 = (startRect.top + startRect.height / 2) - boardRect.top;
      const x2 = (endRect.left + endRect.width / 2) - boardRect.left;
      const y2 = (endRect.top + endRect.height / 2) - boardRect.top;

      this.winningLineCoords = {
        x1: `${x1}px`,
        y1: `${y1}px`,
        x2: `${x2}px`,
        y2: `${y2}px`,
      };
      
      this.winningLineLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }
  }

  private restartGame() {
    this.initAudio();
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.winner = null;
    this.winningCombination = null;
    this.isDraw = false;
    this.winningLineCoords = null;
    this.winningLineLength = 0;
    this.playSound('restart');
  }
  
  private toggleGlassMode() {
    this.initAudio();
    this.isGlassMode = !this.isGlassMode;
    this.classList.toggle('glass-mode', this.isGlassMode);
    this.playSound('magic');
  }

  private getStatusMessage() {
    if (this.winner) {
      return html`WINNER: <span class="player ${this.winner.toLowerCase()}">${this.winner}</span>!`;
    }
    if (this.isDraw) {
      // FIX: The string literal was causing parsing errors. Using the html tag helper for consistency.
      return html`IT'S A DRAW!`;
    }
    return html`TURN: <span class="player ${this.currentPlayer.toLowerCase()}">${this.currentPlayer}</span>`;
  }

  override render() {
    const gameWrapperClasses = {
      'game-wrapper': true,
      'game-over': !!this.winner || this.isDraw,
    };

    return html`
      <div class="glass-mode-toggle" @click=${this.toggleGlassMode} role="button" aria-pressed="${this.isGlassMode}" aria-label="Toggle visual theme">
        ${svg`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9.4,3.4l-3,3l-0.9-0.9c-0.4-0.4-1-0.4-1.4,0s-0.4,1,0,1.4l0.9,0.9l-3,3c-0.4,0.4-0.4,1,0,1.4s1,0.4,1.4,0l3-3l0.9,0.9 c0.4,0.4,1,0.4,1.4,0s0.4-1,0-1.4L8,8.8l3-3c0.4-0.4,0.4-1,0-1.4S9.8,3,9.4,3.4z M19.7,8.3c-0.4-0.4-1-0.4-1.4,0l-8.6,8.6 c-0.4,0.4-0.4,1,0,1.4s1,0.4,1.4,0l8.6-8.6C20.1,9.3,20.1,8.7,19.7,8.3z M18,2l-1.5,4.5L12,8l4.5,1.5L18,14l1.5-4.5L24,8l-4.5-1.5 L18,2z M12,14l-1.1,3.2L7.7,18.3l3.2,1.1L12,22.6l1.1-3.2l3.2-1.1l-3.2-1.1L12,14z" fill="currentColor"></path></svg>`}
      </div>
      <div class=${classMap(gameWrapperClasses)}>
        <h1>Tic-Tac-Toe</h1>
        <div class="status">${this.getStatusMessage()}</div>
        <div class="board-container">
          <div class="board">
            ${this.board.map((player, index) => html`
              <button
                class="cell ${player ? player.toLowerCase() : ''} ${this.winningCombination?.includes(index) ? 'win' : ''}"
                @click=${() => this.handleCellClick(index)}
                ?disabled=${!!player || !!this.winner}
                aria-label="Cell ${index + 1}, ${player ? 'played by ' + player : 'empty'}"
              >
                ${player || ''}
              </button>
            `)}
          </div>
          ${this.winningLineCoords ? html`
            <svg class="line-svg">
              <line
                class="winning-line ${this.winner ? 'visible' : ''}"
                style="--line-length: ${this.winningLineLength}px;"
                x1=${this.winningLineCoords.x1}
                y1=${this.winningLineCoords.y1}
                x2=${this.winningLineCoords.x2}
                y2=${this.winningLineCoords.y2}
              />
            </svg>
          ` : ''}
        </div>
        <button class="restart-button" @click=${this.restartGame}>Restart Game</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tic-tac-toe-game': TicTacToeGame
  }
}