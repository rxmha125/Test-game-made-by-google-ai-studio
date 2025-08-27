/**
 * @fileoverview A Tic-Tac-Toe game.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import './components/TicTacToeGame';

function main() {
  const game = document.createElement('tic-tac-toe-game');
  document.body.appendChild(game);
}

main();
