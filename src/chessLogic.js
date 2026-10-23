import { Chess } from 'chess.js'

export function createGameState(fen) {
  return new Chess(fen)
}

export function makeMove(game, from, to, promotion = 'q') {
  return game.move({ from, to, promotion })
}

export function getLegalMoves(game, square) {
  return game.moves({ square, verbose: true }).map((move) => move.to)
}

export function getGameStatus(game) {
  if (game.isCheckmate()) {
    const winner = game.turn() === 'w' ? 'Black' : 'White'
    return {
      type: 'checkmate',
      winner,
      message: `${winner} wins by checkmate.`,
    }
  }

  if (game.isStalemate()) {
    return {
      type: 'stalemate',
      winner: 'Draw',
      message: 'Stalemate — no legal move is available.',
    }
  }

  if (game.isThreefoldRepetition()) {
    return {
      type: 'draw',
      winner: 'Draw',
      message: 'Draw by threefold repetition.',
    }
  }

  if (game.isInsufficientMaterial()) {
    return {
      type: 'draw',
      winner: 'Draw',
      message: 'Draw by insufficient material.',
    }
  }

  if (game.isDraw()) {
    return {
      type: 'draw',
      winner: 'Draw',
      message: 'Draw by the fifty-move rule or dead position.',
    }
  }

  if (game.inCheck()) {
    return {
      type: 'check',
      winner: null,
      message: `${game.turn() === 'w' ? 'White' : 'Black'} is in check.`,
    }
  }

  return {
    type: 'ongoing',
    winner: null,
    message: 'Game in progress.',
  }
}
