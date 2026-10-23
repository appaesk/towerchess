import { describe, expect, it } from 'vitest'
import { createGameState, getGameStatus, makeMove, getLegalMoves } from './chessLogic.js'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings.js'

describe('chess logic', () => {
  it('starts from the standard initial position', () => {
    const game = createGameState()
    expect(game.fen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    expect(game.turn()).toBe('w')
  })

  it('allows a legal opening move', () => {
    const game = createGameState()
    const move = makeMove(game, 'e2', 'e4')
    expect(move).toMatchObject({ from: 'e2', to: 'e4', color: 'w' })
    expect(game.turn()).toBe('b')
  })

  it('detects checkmate after Fool\'s Mate', () => {
    const game = createGameState()
    makeMove(game, 'f2', 'f3')
    makeMove(game, 'e7', 'e5')
    makeMove(game, 'g2', 'g4')
    makeMove(game, 'd8', 'h4')

    const status = getGameStatus(game)
    expect(game.isCheckmate()).toBe(true)
    expect(status.type).toBe('checkmate')
    expect(status.winner).toBe('Black')
  })

  it('lists legal destinations for a selected square', () => {
    const game = createGameState()
    const moves = getLegalMoves(game, 'e2')
    expect(moves).toContain('e3')
    expect(moves).toContain('e4')
  })
})

describe('settings persistence', () => {
  it('restores default values when storage is invalid', () => {
    const parsed = loadSettings('{not valid json}')
    expect(parsed).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps valid values and validates ranges', () => {
    const saved = {
      board: { lightSquare: '#ffffff', darkSquare: '#2e2e2e', baseColor: '#b7d0ff', borderColor: '#dfeafc' },
      pieces: { white: '#f5f7ff', black: '#121826', scale: 1.2 },
      towerAssignment: { king: 'tokyo' },
      transparency: 0.6,
      gloss: 0.4,
    }

    const normalized = loadSettings(JSON.stringify(saved))
    expect(normalized.pieces.scale).toBeGreaterThanOrEqual(0.8)
    expect(normalized.pieces.scale).toBeLessThanOrEqual(1.4)
    expect(normalized.board.lightSquare).toBe('#ffffff')
  })

  it('saves and loads settings without mutating defaults', () => {
    const saved = saveSettings({ ...DEFAULT_SETTINGS, pieces: { ...DEFAULT_SETTINGS.pieces, scale: 1.25 } })
    expect(saved.pieces.scale).toBe(1.25)
    expect(DEFAULT_SETTINGS.pieces.scale).toBe(1)
  })
})
