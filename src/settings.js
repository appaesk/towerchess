export const TOWER_OPTIONS = [
  { id: 'tokyo-tower', name: 'Tokyo Tower', city: 'Tokyo', prefecture: 'Tokyo', height: '333 m', defaultRole: 'king' },
  { id: 'skytree', name: 'Tokyo Skytree', city: 'Tokyo', prefecture: 'Tokyo', height: '634 m', defaultRole: 'queen' },
  { id: 'fukuoka-tower', name: 'Fukuoka Tower', city: 'Fukuoka', prefecture: 'Fukuoka', height: '234 m', defaultRole: 'bishop' },
  { id: 'mirai-tower', name: 'Chubu Electric Power MIRAI TOWER', city: 'Nagoya', prefecture: 'Aichi', height: '180 m', defaultRole: 'knight' },
  { id: 'kyoto-tower', name: 'Nidec Kyoto Tower', city: 'Kyoto', prefecture: 'Kyoto', height: '124 m', defaultRole: 'pawn' },
  { id: 'kobe-tower', name: 'Kobe Port Tower', city: 'Kobe', prefecture: 'Hyogo', height: '108 m', defaultRole: 'rook' },
  { id: 'tsutenkaku', name: 'Tsutenkaku', city: 'Osaka', prefecture: 'Osaka', height: '103 m', defaultRole: 'extra' },
  { id: 'marine-tower', name: 'Yokohama Marine Tower', city: 'Yokohama', prefecture: 'Kanagawa', height: '106 m', defaultRole: 'extra' },
  { id: 'sapporo-tower', name: 'Sapporo TV Tower', city: 'Sapporo', prefecture: 'Hokkaido', height: '147.2 m', defaultRole: 'extra' },
]

export const DEFAULT_SETTINGS = {
  board: {
    lightSquare: '#f7f0ff',
    darkSquare: '#6ea8d6',
    baseColor: '#dfe9ff',
    borderColor: '#b8d4ff',
    transparency: 0.7,
    gloss: 0.4,
  },
  pieces: {
    white: '#f6fbff',
    black: '#1b2541',
    scale: 1,
    tint: 0.85,
  },
  towerAssignment: {
    king: 'tokyo-tower',
    queen: 'skytree',
    bishop: 'fukuoka-tower',
    knight: 'mirai-tower',
    rook: 'kobe-tower',
    pawn: 'kyoto-tower',
  },
  camera: {
    yaw: -1.15,
    pitch: 1.1,
    distance: 10,
  },
}

const STORAGE_KEY = 'chesstowerjp-preferences'
const memoryStore = {}

function getStorage() {
  if (typeof localStorage !== 'undefined') {
    return localStorage
  }
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null
    },
    setItem(key, value) {
      memoryStore[key] = String(value)
    },
    removeItem(key) {
      delete memoryStore[key]
    },
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function normalizeHex(value, fallback) {
  if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    return fallback
  }
  return value
}

function normalizeSettings(settings) {
  const safe = structuredClone(DEFAULT_SETTINGS)
  const board = settings?.board ?? {}
  const pieces = settings?.pieces ?? {}
  const towerAssignment = settings?.towerAssignment ?? {}
  const camera = settings?.camera ?? {}

  safe.board.lightSquare = normalizeHex(board.lightSquare, DEFAULT_SETTINGS.board.lightSquare)
  safe.board.darkSquare = normalizeHex(board.darkSquare, DEFAULT_SETTINGS.board.darkSquare)
  safe.board.baseColor = normalizeHex(board.baseColor, DEFAULT_SETTINGS.board.baseColor)
  safe.board.borderColor = normalizeHex(board.borderColor, DEFAULT_SETTINGS.board.borderColor)
  safe.board.transparency = clamp(Number(board.transparency ?? DEFAULT_SETTINGS.board.transparency), 0.2, 0.95)
  safe.board.gloss = clamp(Number(board.gloss ?? DEFAULT_SETTINGS.board.gloss), 0.1, 0.9)

  safe.pieces.white = normalizeHex(pieces.white, DEFAULT_SETTINGS.pieces.white)
  safe.pieces.black = normalizeHex(pieces.black, DEFAULT_SETTINGS.pieces.black)
  safe.pieces.scale = clamp(Number(pieces.scale ?? DEFAULT_SETTINGS.pieces.scale), 0.8, 1.4)
  safe.pieces.tint = clamp(Number(pieces.tint ?? DEFAULT_SETTINGS.pieces.tint), 0.2, 1)

  safe.camera.yaw = Number(camera.yaw ?? DEFAULT_SETTINGS.camera.yaw)
  safe.camera.pitch = clamp(Number(camera.pitch ?? DEFAULT_SETTINGS.camera.pitch), 0.2, 1.6)
  safe.camera.distance = clamp(Number(camera.distance ?? DEFAULT_SETTINGS.camera.distance), 6, 16)

  for (const role of Object.keys(DEFAULT_SETTINGS.towerAssignment)) {
    const chosen = towerAssignment[role]
    safe.towerAssignment[role] = TOWER_OPTIONS.some((tower) => tower.id === chosen) ? chosen : DEFAULT_SETTINGS.towerAssignment[role]
  }

  return safe
}

export function loadSettings(rawValue) {
  const storage = getStorage()

  if (typeof rawValue === 'undefined') {
    const saved = storage.getItem(STORAGE_KEY)
    if (!saved) {
      return structuredClone(DEFAULT_SETTINGS)
    }
    rawValue = saved
  }

  try {
    const parsed = JSON.parse(rawValue)
    return normalizeSettings(parsed)
  } catch {
    return structuredClone(DEFAULT_SETTINGS)
  }
}

export function saveSettings(settings) {
  const normalized = normalizeSettings(settings)
  const storage = getStorage()
  storage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

export function restoreDefaults() {
  const storage = getStorage()
  storage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS))
  return structuredClone(DEFAULT_SETTINGS)
}
