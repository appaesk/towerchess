import './style.css'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { createGameState, getGameStatus, getLegalMoves, makeMove } from './chessLogic.js'
import { DEFAULT_SETTINGS, TOWER_OPTIONS, loadSettings, restoreDefaults, saveSettings } from './settings.js'
import { createTowerModel } from './towerModels.js'

const app = document.querySelector('#app')
app.innerHTML = `
  <div class="page-shell">
    <header class="toolbar glass-panel">
      <div class="brand-wrap">
        <div class="brand-mark">🗼</div>
        <div>
          <p class="eyebrow">Tower Chess - Japanese Version</p>
          <h1>TOWERCHESS</h1>
        </div>
      </div>
      <div class="toolbar-actions" aria-label="Main controls">
        <button type="button" class="primary-btn" id="reset-btn" aria-label="Reset game" title="Reset game">
          <span class="button-icon" aria-hidden="true">↻</span><span class="button-label">Reset</span>
        </button>
        <button type="button" class="primary-btn" id="settings-btn" aria-label="Open settings" title="Open settings">
          <span class="button-icon settings-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm9 3.5-2.2-.8a7.1 7.1 0 0 0-.7-1.7l1-2.1-1.9-1.9-2.1 1a7.1 7.1 0 0 0-1.7-.7L12.6 3h-2.7l-.8 2.2a7.1 7.1 0 0 0-1.7.7l-2.1-1-1.9 1.9 1 2.1a7.1 7.1 0 0 0-.7 1.7L1.5 12v2.7l2.2.8c.2.6.4 1.2.7 1.7l-1 2.1 1.9 1.9 2.1-1c.5.3 1.1.6 1.7.7l.8 2.2h2.7l.8-2.2a7.1 7.1 0 0 0 1.7-.7l2.1 1 1.9-1.9-1-2.1c.3-.5.6-1.1.7-1.7l2.2-.8V12Z"/></svg>
          </span><span class="button-label">Settings</span>
        </button>
        <button type="button" class="primary-btn" id="info-btn" aria-label="About the game" title="About the game">
          <span class="button-icon" aria-hidden="true">ⓘ</span><span class="button-label">About</span>
        </button>
      </div>
    </header>

    <main class="board-shell">
      <section class="board-panel glass-panel">
        <div id="scene-container" aria-label="3D chessboard scene"></div>
      </section>
      <div id="status-strip" class="status-strip" aria-live="polite"></div>
    </main>
  </div>

  <div id="modal-root" class="modal-root hidden" aria-live="polite"></div>
  <div id="toast" class="toast" aria-live="polite" role="status"></div>
`

const state = {
  settings: loadSettings(),
  game: createGameState(),
  selectedSquare: null,
  legalMoves: [],
  lastMove: null,
  activeModal: null,
  boardSquares: [],
  pieceMeshes: [],
  animatedPiece: null,
  pieceRenderVersion: 0,
}

const sceneContainer = document.querySelector('#scene-container')
const statusStrip = document.querySelector('#status-strip')
const modalRoot = document.querySelector('#modal-root')
const toast = document.querySelector('#toast')

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
const orbit = {
  yaw: state.settings.camera.yaw,
  pitch: 0.92,
  distance: 20.5,
  target: new THREE.Vector3(0, 0.2, 0),
}

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0x000000, 0)
sceneContainer.appendChild(renderer.domElement)

const gltfLoader = new GLTFLoader()
const towerAssetCache = new Map()
const towerThumbnailCache = new Map()
const THUMBNAIL_SIZE = 512
let thumbnailRenderer = null
let thumbnailScene = null
let thumbnailCamera = null

const ambient = new THREE.HemisphereLight(0xf7f5ff, 0xbecbff, 1.4)
scene.add(ambient)

const keyLight = new THREE.DirectionalLight(0xffffff, 1.5)
keyLight.position.set(6, 10, 6)
scene.add(keyLight)

const fillLight = new THREE.DirectionalLight(0xc3d9ff, 0.9)
fillLight.position.set(-7, 8, -3)
scene.add(fillLight)

const boardGroup = new THREE.Group()
scene.add(boardGroup)

const boardSquaresRoot = new THREE.Group()
const highlightGroup = new THREE.Group()
boardGroup.add(boardSquaresRoot)
boardGroup.add(highlightGroup)

const boardBase = new THREE.Mesh(
  new THREE.BoxGeometry(9.5, 0.6, 9.5),
  new THREE.MeshPhysicalMaterial({
    color: state.settings.board.baseColor,
    transparent: true,
    opacity: state.settings.board.transparency,
    roughness: 0.36,
    metalness: 0.18,
    clearcoat: 0.9,
    clearcoatRoughness: 0.25,
  }),
)
boardBase.position.y = -0.38
boardGroup.add(boardBase)

const boardBorder = new THREE.Mesh(
  new THREE.BoxGeometry(9.9, 0.3, 9.9),
  new THREE.MeshPhysicalMaterial({
    color: state.settings.board.borderColor,
    transparent: true,
    opacity: 0.74,
    roughness: 0.28,
    metalness: 0.2,
    clearcoat: 0.9,
    transmission: 0.25,
  }),
)
boardBorder.position.y = -0.72
boardGroup.add(boardBorder)

function squareToWorld(square) {
  const fileIndex = square.charCodeAt(0) - 97
  const rankNumber = Number(square[1])
  return {
    x: fileIndex - 3.5,
    z: 4.5 - rankNumber,
  }
}

function createBoardSquares() {
  boardSquaresRoot.clear()
  state.boardSquares = []

  for (let rankIndex = 0; rankIndex < 8; rankIndex += 1) {
    for (let fileIndex = 0; fileIndex < 8; fileIndex += 1) {
      const isLight = (fileIndex + rankIndex) % 2 === 0
      const color = isLight ? state.settings.board.lightSquare : state.settings.board.darkSquare
      const material = new THREE.MeshPhysicalMaterial({
        color,
        transparent: true,
        opacity: state.settings.board.transparency,
        roughness: 0.7,
        metalness: 0.08,
        clearcoat: 0.8,
      })

      const square = `${String.fromCharCode(97 + fileIndex)}${8 - rankIndex}`
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 1), material)
      const { x, z } = squareToWorld(square)
      mesh.position.set(x, 0.05, z)
      mesh.userData.square = square
      mesh.userData.type = 'square'
      boardSquaresRoot.add(mesh)
      state.boardSquares.push(mesh)
    }
  }
}

function updateBoardAppearance() {
  state.boardSquares.forEach((square) => {
    const isLight = (square.userData.square.charCodeAt(0) - 97 + Number(square.userData.square[1]) - 1) % 2 === 0
    const color = isLight ? state.settings.board.lightSquare : state.settings.board.darkSquare
    square.material.color.set(color)
    square.material.opacity = state.settings.board.transparency
    square.material.clearcoat = state.settings.board.gloss
  })

  boardBase.material.color.set(state.settings.board.baseColor)
  boardBase.material.opacity = state.settings.board.transparency
  boardBase.material.clearcoat = state.settings.board.gloss
  boardBorder.material.color.set(state.settings.board.borderColor)
  updatePageBackground()
  scheduleRender()
}

function updatePageBackground() {
  const color = new THREE.Color(state.settings.board.darkSquare)
  document.documentElement.style.setProperty('--board-dark-rgb', `${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}`)
}

function resolveTowerIdForPiece(piece) {
  const roleMap = {
    k: 'king',
    q: 'queen',
    b: 'bishop',
    n: 'knight',
    r: 'rook',
    p: 'pawn',
  }
  const role = roleMap[piece.type]
  return state.settings.towerAssignment[role]
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose()
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((material) => material.dispose())
    }
  })
}

function loadTowerAsset(towerId) {
  if (!towerAssetCache.has(towerId)) {
    const assetUrl = `${import.meta.env.BASE_URL}assets/towers/${towerId}/model.glb`
    const assetPromise = gltfLoader
      .loadAsync(assetUrl)
      .then((gltf) => gltf.scene)
      .catch((error) => {
        towerAssetCache.delete(towerId)
        console.warn(`Using procedural fallback for ${towerId}; could not load ${assetUrl}.`, error)
        return null
      })
    towerAssetCache.set(towerId, assetPromise)
  }
  return towerAssetCache.get(towerId)
}

function createTowerThumbnail(towerId) {
  if (!towerThumbnailCache.has(towerId)) {
    const thumbnailPromise = loadTowerAsset(towerId).then((source) => {
      if (!source) return ''

      if (!thumbnailRenderer) {
        thumbnailScene = new THREE.Scene()
        thumbnailCamera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
        thumbnailCamera.position.set(0, 1.15, 4.2)
        thumbnailCamera.lookAt(0, 0.9, 0)
        thumbnailRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
        thumbnailRenderer.setSize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, false)
        thumbnailRenderer.setPixelRatio(1)
        thumbnailRenderer.setClearColor(0x000000, 0)
        thumbnailScene.add(new THREE.HemisphereLight(0xf7f5ff, 0xbecbff, 1.7))
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.8)
        keyLight.position.set(3, 5, 4)
        thumbnailScene.add(keyLight)
      }

      const model = prepareTowerAsset(source, 0.7, state.settings.pieces.white)
      if (!model) {
        return ''
      }
      model.position.y = 0.05
      thumbnailScene.add(model)
      thumbnailRenderer.render(thumbnailScene, thumbnailCamera)
      const thumbnail = thumbnailRenderer.domElement.toDataURL('image/png')
      thumbnailScene.remove(model)
      disposeObject(model)
      return thumbnail
    })
    towerThumbnailCache.set(towerId, thumbnailPromise)
  }
  return towerThumbnailCache.get(towerId)
}

function applyPieceGlassMaterial(material, color) {
  const materialName = (material.name ?? '').toLowerCase()
  const protectedPattern = /line|border|edge|frame|trim|wire|metal|accent|glow|outline|lattice/
  const glassPattern = /glass|body|frost|core|shell|tower/
  const basePattern = /base|plinth|pedestal|foundation|foot/
  const isTransparentMaterial = material.transparent || (material.transmission ?? 0) > 0
  if (basePattern.test(materialName)) {
    if (material.color) material.color.copy(new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.18))
    material.transparent = true
    material.opacity = 0.94
    material.depthWrite = true
    if ('transmission' in material) material.transmission = 0.12
    if ('roughness' in material) material.roughness = 0.28
    if ('metalness' in material) material.metalness = 0.12
    if (material.emissive) material.emissive.set(0x000000)
    return
  }
  if (protectedPattern.test(materialName) || (!glassPattern.test(materialName) && !isTransparentMaterial)) return

  const targetColor = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.3)
  if (material.color) material.color.copy(targetColor)
  material.transparent = true
  material.opacity = 0.6
  material.depthWrite = true
  material.side = THREE.DoubleSide
  if ('transmission' in material) material.transmission = 0.6
  if ('roughness' in material) material.roughness = 0.42
  if ('metalness' in material) material.metalness = 0.08
  if ('clearcoat' in material) material.clearcoat = 0.06
  if ('envMapIntensity' in material) material.envMapIntensity = 0.35
  if ('reflectivity' in material) material.reflectivity = 0.25
  if (material.emissive) material.emissive.set(0x000000)
}

function prepareTowerAsset(source, scale, color) {
  const model = source.clone(true)
  model.traverse((child) => {
    if (child.material) {
      child.material = Array.isArray(child.material)
        ? child.material.map((material) => material.clone())
        : child.material.clone()

      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((material) => {
        applyPieceGlassMaterial(material, color)
      })
    }
  })
  model.updateMatrixWorld(true)
  const initialBounds = new THREE.Box3().setFromObject(model)
  const initialSize = initialBounds.getSize(new THREE.Vector3())
  if (!initialSize.x || !initialSize.y || !initialSize.z) return null

  if (initialSize.x > initialSize.y && initialSize.x >= initialSize.z) {
    model.rotation.z += Math.PI / 2
  } else if (initialSize.z > initialSize.y && initialSize.z >= initialSize.x) {
    model.rotation.x -= Math.PI / 2
  }

  const targetHeight = 2 * (scale / 0.7)
  model.updateMatrixWorld(true)
  const orientedBounds = new THREE.Box3().setFromObject(model)
  const orientedSize = orientedBounds.getSize(new THREE.Vector3())
  model.scale.setScalar(targetHeight / orientedSize.y)

  model.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(model)
  const center = bounds.getCenter(new THREE.Vector3())
  model.position.x -= center.x
  model.position.y -= bounds.min.y
  model.position.z -= center.z
  return model
}

function setPieceMetadata(mesh, square, piece) {
  mesh.traverse((child) => {
    child.userData.square = square
    child.userData.piece = piece
    child.userData.type = 'piece'
  })
}

function getPieceScale(pieceType, baseScale = state.settings.pieces.scale) {
  const sizeFactor = pieceType === 'p' ? 0.41 : 0.49
  return baseScale * sizeFactor
}

function renderPieces() {
  state.pieceMeshes.forEach((mesh) => {
    boardGroup.remove(mesh)
    disposeObject(mesh)
  })
  state.pieceMeshes = []
  const renderVersion = state.pieceRenderVersion + 1
  state.pieceRenderVersion = renderVersion

  const board = state.game.board()
  for (let rankIndex = 0; rankIndex < board.length; rankIndex += 1) {
    for (let fileIndex = 0; fileIndex < board[rankIndex].length; fileIndex += 1) {
      const piece = board[rankIndex][fileIndex]
      if (!piece) continue

      const square = `${String.fromCharCode(97 + fileIndex)}${8 - rankIndex}`
      const towerId = resolveTowerIdForPiece(piece)
      const isWhite = piece.color === 'w'
      const color = isWhite ? state.settings.pieces.white : state.settings.pieces.black
      const pieceScale = getPieceScale(piece.type)
      const mesh = createTowerModel(towerId, color, pieceScale, state.settings.pieces.tint, piece.type)
      const { x, z } = squareToWorld(square)
      mesh.position.set(x, 0.16, z)
      mesh.userData.square = square
      mesh.userData.piece = piece
      mesh.userData.type = 'piece'
      boardGroup.add(mesh)
      state.pieceMeshes.push(mesh)

      loadTowerAsset(towerId).then((source) => {
        if (!source || renderVersion !== state.pieceRenderVersion) return
        const loadedMesh = prepareTowerAsset(source, pieceScale, color)
        if (!loadedMesh) return

        const meshIndex = state.pieceMeshes.indexOf(mesh)
        if (meshIndex === -1) return
        loadedMesh.position.set(x, 0.16, z)
        setPieceMetadata(loadedMesh, square, piece)
        boardGroup.remove(mesh)
        disposeObject(mesh)
        boardGroup.add(loadedMesh)
        state.pieceMeshes[meshIndex] = loadedMesh
        scheduleRender()
      })
    }
  }
  scheduleRender()
}

function clearHighlights() {
  highlightGroup.clear()
}

function addSquareHighlight(square, color, opacity = 0.35, size = 0.82) {
  const { x, z } = squareToWorld(square)
  const borderGroup = new THREE.Group()
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: Math.min(opacity + 0.25, 1),
    depthWrite: false,
  })
  const thickness = 0.055
  const height = 0.055
  const barLength = size + thickness
  const bars = [
    new THREE.Mesh(new THREE.BoxGeometry(barLength, height, thickness), material),
    new THREE.Mesh(new THREE.BoxGeometry(barLength, height, thickness), material),
    new THREE.Mesh(new THREE.BoxGeometry(thickness, height, barLength), material),
    new THREE.Mesh(new THREE.BoxGeometry(thickness, height, barLength), material),
  ]
  bars[0].position.set(0, 0, -size / 2)
  bars[1].position.set(0, 0, size / 2)
  bars[2].position.set(-size / 2, 0, 0)
  bars[3].position.set(size / 2, 0, 0)
  bars.forEach((bar) => borderGroup.add(bar))
  borderGroup.position.set(x, 0.16, z)
  highlightGroup.add(borderGroup)
}

function renderHighlights() {
  clearHighlights()

  if (state.lastMove) {
    addSquareHighlight(state.lastMove.from, 0xf6d365, 0.45, 0.82)
    addSquareHighlight(state.lastMove.to, 0xf6d365, 0.45, 0.82)

    if (state.lastMove.captured) {
      const { x, z } = squareToWorld(state.lastMove.to)
      const captureRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.055, 10, 32),
        new THREE.MeshBasicMaterial({
          color: 0xff6b6b,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
        }),
      )
      captureRing.rotation.x = Math.PI / 2
      captureRing.position.set(x, 0.28, z)
      highlightGroup.add(captureRing)
    }
  }

  if (state.selectedSquare) {
    addSquareHighlight(state.selectedSquare, 0x7af0ff, 0.6, 0.9)
  }

  state.legalMoves.forEach((target) => {
    const { x, z } = squareToWorld(target)
    const targetPiece = state.game.get(target)
    if (targetPiece) {
      const captureTarget = new THREE.Mesh(
        new THREE.TorusGeometry(0.4, 0.07, 10, 32),
        new THREE.MeshStandardMaterial({
          color: 0x95ffa9,
          transparent: true,
          opacity: 0.95,
          emissive: 0x2ddc7a,
          emissiveIntensity: 0.55,
          depthWrite: false,
        }),
      )
      captureTarget.rotation.x = Math.PI / 2
      captureTarget.position.set(x, 0.3, z)
      highlightGroup.add(captureTarget)
      return
    }

    const dot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.08, 24),
      new THREE.MeshStandardMaterial({
        color: 0x95ffa9,
        transparent: true,
        opacity: 0.8,
        emissive: 0x2ddc7a,
        emissiveIntensity: 0.3,
      }),
    )
    dot.position.set(x, 0.18, z)
    highlightGroup.add(dot)
  })

  if (state.game.inCheck()) {
    const kingColor = state.game.turn() === 'w' ? 'b' : 'w'
    const board = state.game.board()
    for (let rank = 0; rank < board.length; rank += 1) {
      for (let file = 0; file < board[rank].length; file += 1) {
        const piece = board[rank][file]
        if (piece && piece.type === 'k' && piece.color === kingColor) {
          const square = `${String.fromCharCode(97 + file)}${8 - rank}`
          addSquareHighlight(square, 0xff6b6b, 0.7, 0.9)
          return
        }
      }
    }
  }
  scheduleRender()
}

function updateStatusStrip() {
  const status = getGameStatus(state.game)
  if (status.type === 'ongoing') {
    const turnLabel = state.game.turn() === 'w' ? 'White' : 'Black'
    const statusText = state.game.inCheck() ? `${turnLabel} to move — check.` : `${turnLabel} to move.`
    statusStrip.textContent = statusText
    return
  }
  statusStrip.textContent = status.message
}

function animateMove(fromSquare, toSquare) {
  const movingPiece = state.pieceMeshes.find((mesh) => mesh.userData.square === fromSquare)
  if (!movingPiece) return

  const fromPoint = squareToWorld(fromSquare)
  const toPoint = squareToWorld(toSquare)
  const start = { x: fromPoint.x, y: movingPiece.position.y, z: fromPoint.z }
  const end = { x: toPoint.x, y: 0.16, z: toPoint.z }
  const frameDuration = 420
  const startTime = performance.now()

  function updateMovement(now) {
    const progress = Math.min((now - startTime) / frameDuration, 1)
    const eased = 1 - (1 - progress) ** 3
    movingPiece.position.x = THREE.MathUtils.lerp(start.x, end.x, eased)
    movingPiece.position.z = THREE.MathUtils.lerp(start.z, end.z, eased)
    movingPiece.position.y = THREE.MathUtils.lerp(start.y, end.y, eased) + Math.sin(progress * Math.PI) * 0.22
    renderer.render(scene, camera)
    if (progress < 1) {
      requestAnimationFrame(updateMovement)
    } else {
      movingPiece.userData.square = toSquare
      state.animatedPiece = null
      scheduleRender()
    }
  }

  state.animatedPiece = movingPiece
  requestAnimationFrame(updateMovement)
}

function handleMoveAttempt(square) {
  if (state.selectedSquare && state.legalMoves.includes(square)) {
    const move = makeMove(state.game, state.selectedSquare, square)
    if (move) {
      const fromSquare = state.selectedSquare
      state.lastMove = { from: fromSquare, to: square, captured: Boolean(move.captured) }
      state.selectedSquare = null
      state.legalMoves = []
      animateMove(fromSquare, square)
      setTimeout(() => {
        renderPieces()
        renderHighlights()
        updateStatusStrip()
        const summary = getGameStatus(state.game)
        if (['checkmate', 'stalemate', 'draw'].includes(summary.type)) {
          openSummaryModal(summary)
        }
      }, 420)
      return true
    }
  }
  return false
}

function setSelection(square) {
  const piece = state.game.get(square)

  if (piece && piece.color === state.game.turn()) {
    state.selectedSquare = square
    state.legalMoves = getLegalMoves(state.game, square)
    renderHighlights()
    return
  }

  if (handleMoveAttempt(square)) {
    return
  }

  state.selectedSquare = null
  state.legalMoves = []
  renderHighlights()
}

function showToast(message) {
  toast.textContent = message
  toast.classList.add('visible')
  clearTimeout(showToast.timeoutId)
  showToast.timeoutId = setTimeout(() => toast.classList.remove('visible'), 1800)
}

function openSummaryModal(summary) {
  state.activeModal = 'summary'
  modalRoot.classList.remove('hidden')
  modalRoot.innerHTML = `
    <div class="modal-card summary-card glass-panel">
      <div class="modal-header">
        <div>
          <p class="eyebrow">Game complete</p>
          <h2>${summary.winner === 'Draw' ? 'Draw' : `${summary.winner} wins`}</h2>
        </div>
        <button type="button" class="close-button" data-action="close-modal" aria-label="Close game result">×</button>
      </div>
      <p class="summary-result">${summary.message}</p>
      <p class="summary-fen-label">Final position</p>
      <code>${state.game.fen()}</code>
      <button type="button" class="primary-btn summary-reset" data-action="reset-summary">Reset board</button>
    </div>
  `

  modalRoot.querySelector('[data-action="close-modal"]').addEventListener('click', closeModal)
  modalRoot.querySelector('[data-action="reset-summary"]').addEventListener('click', () => {
    state.game = createGameState()
    state.selectedSquare = null
    state.legalMoves = []
    state.lastMove = null
    renderPieces()
    renderHighlights()
    updateStatusStrip()
    closeModal()
  })
}

function getTowerInfoCard(tower) {
  return `
    <article class="tower-card glass-panel">
      <div class="tower-card-header">
        <div>
          <p class="eyebrow">${tower.city}</p>
          <h3 class="tower-name ${tower.name.length > 22 ? 'is-long' : ''}"><span>${tower.name}</span></h3>
        </div>
        <span class="tower-height">${tower.height}</span>
      </div>
      <img class="tower-preview" data-tower-thumbnail="${tower.id}" alt="${tower.name} 3D model preview" />
    </article>
  `
}

function renderSettingsModal() {
  state.activeModal = 'settings'
  modalRoot.classList.remove('hidden')
  modalRoot.innerHTML = `
    <div class="modal-card glass-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div class="modal-header">
        <div>
          <p class="eyebrow">Customise your board</p>
          <h2 id="settings-title">Settings</h2>
        </div>
        <button type="button" class="close-button" data-action="close-modal" aria-label="Close settings">×</button>
      </div>

      <div class="settings-grid">
        <div class="settings-group full-width">
          <h3>Tower assignments</h3>
          <div class="tower-selects">
            ${Object.entries(state.settings.towerAssignment)
              .map(
                ([role, value]) => `
                  <div class="tower-picker" data-role="${role}">
                    <span class="tower-picker-label">${role.charAt(0).toUpperCase() + role.slice(1)}</span>
                    <button type="button" class="tower-picker-trigger" aria-haspopup="listbox" aria-expanded="false">
                      <img data-tower-thumbnail="${value}" alt="" />
                      <span>${TOWER_OPTIONS.find((tower) => tower.id === value).name}</span>
                      <span class="tower-picker-arrow" aria-hidden="true">⌄</span>
                    </button>
                    <div class="tower-picker-menu" role="listbox" tabindex="-1" aria-label="${role} tower">
                      ${TOWER_OPTIONS.map(
                        (tower) => `
                          <button type="button" class="tower-picker-option ${tower.id === value ? 'is-selected' : ''}" role="option" aria-selected="${tower.id === value}" data-value="${tower.id}">
                            <img data-tower-thumbnail="${tower.id}" alt="" />
                            <span>${tower.name}</span>
                          </button>
                        `,
                      ).join('')}
                    </div>
                  </div>
                `,
              )
              .join('')}
          </div>
        </div>

        <div class="settings-group">
          <h3>Board appearance</h3>
          <label>Light square<input type="color" data-group="board" data-key="lightSquare" value="${state.settings.board.lightSquare}" /></label>
          <label>Dark square<input type="color" data-group="board" data-key="darkSquare" value="${state.settings.board.darkSquare}" /></label>
          <label>Board base<input type="color" data-group="board" data-key="baseColor" value="${state.settings.board.baseColor}" /></label>
          <label>Board border<input type="color" data-group="board" data-key="borderColor" value="${state.settings.board.borderColor}" /></label>
          <label>Transparency<input type="range" min="0.2" max="0.95" step="0.01" data-group="board" data-key="transparency" value="${state.settings.board.transparency}" /></label>
          <label>Gloss<input type="range" min="0.1" max="0.9" step="0.01" data-group="board" data-key="gloss" value="${state.settings.board.gloss}" /></label>
        </div>

        <div class="settings-group">
          <h3>Piece appearance</h3>
          <label>White piece<input type="color" data-group="pieces" data-key="white" value="${state.settings.pieces.white}" /></label>
          <label>Black piece<input type="color" data-group="pieces" data-key="black" value="${state.settings.pieces.black}" /></label>
          <label>Piece scale<input type="range" min="0.8" max="1.4" step="0.02" data-group="pieces" data-key="scale" value="${state.settings.pieces.scale}" /></label>
          <label>Glass tint<input type="range" min="0.2" max="1" step="0.02" data-group="pieces" data-key="tint" value="${state.settings.pieces.tint}" /></label>
        </div>

      </div>

      <div class="modal-actions">
        <button type="button" class="secondary-btn" data-action="restore-defaults">Restore defaults</button>
        <button type="button" class="primary-btn" data-action="save-settings">Apply</button>
      </div>
    </div>
  `

  modalRoot.querySelectorAll('[data-group]').forEach((control) => {
    control.addEventListener('input', (event) => {
      const group = event.target.dataset.group
      const key = event.target.dataset.key
      const value = event.target.type === 'range' ? Number(event.target.value) : event.target.value
      state.settings[group][key] = value
    })
  })

  modalRoot.querySelectorAll('.tower-picker').forEach((picker) => {
    const role = picker.dataset.role
    const trigger = picker.querySelector('.tower-picker-trigger')
    const menu = picker.querySelector('.tower-picker-menu')
    const closePicker = () => {
      picker.classList.remove('is-open')
      trigger.setAttribute('aria-expanded', 'false')
    }
    const selectTower = (towerId) => {
      const tower = TOWER_OPTIONS.find((option) => option.id === towerId)
      if (!tower) return
      state.settings.towerAssignment[role] = towerId
      const triggerImage = trigger.querySelector('img')
      triggerImage.dataset.towerThumbnail = towerId
      triggerImage.src = ''
      trigger.querySelector('span').textContent = tower.name
      createTowerThumbnail(towerId).then((thumbnail) => {
        if (state.settings.towerAssignment[role] === towerId) {
          triggerImage.src = thumbnail
        }
      })
      picker.querySelectorAll('.tower-picker-option').forEach((option) => {
        const isSelected = option.dataset.value === towerId
        option.classList.toggle('is-selected', isSelected)
        option.setAttribute('aria-selected', String(isSelected))
      })
      closePicker()
    }
    trigger.addEventListener('click', () => {
      modalRoot.querySelectorAll('.tower-picker.is-open').forEach((openPicker) => {
        if (openPicker !== picker) {
          openPicker.classList.remove('is-open')
          openPicker.querySelector('.tower-picker-trigger').setAttribute('aria-expanded', 'false')
        }
      })
      const isOpen = picker.classList.toggle('is-open')
      trigger.setAttribute('aria-expanded', String(isOpen))
      if (isOpen) menu.focus()
    })
    picker.querySelectorAll('.tower-picker-option').forEach((option) => {
      option.addEventListener('click', () => selectTower(option.dataset.value))
    })
    menu.addEventListener('keydown', (event) => {
      const options = [...picker.querySelectorAll('.tower-picker-option')]
      const currentIndex = options.findIndex((option) => option.classList.contains('is-selected'))
      if (event.key === 'Escape') {
        closePicker()
        trigger.focus()
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const nextIndex = (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
        options[nextIndex].focus()
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        if (document.activeElement?.dataset.value) selectTower(document.activeElement.dataset.value)
      }
    })
  })

  modalRoot.querySelectorAll('[data-tower-thumbnail]').forEach((image) => {
    image.src = ''
    createTowerThumbnail(image.dataset.towerThumbnail).then((thumbnail) => {
      image.src = thumbnail
    })
  })

  modalRoot.querySelector('[data-action="save-settings"]').addEventListener('click', () => {
    state.settings = saveSettings(state.settings)
    updateBoardAppearance()
    renderPieces()
    renderHighlights()
    closeModal()
  })

  modalRoot.querySelector('[data-action="restore-defaults"]').addEventListener('click', () => {
    state.settings = restoreDefaults()
    renderSettingsModal()
    updateBoardAppearance()
    renderPieces()
    renderHighlights()
  })

  modalRoot.querySelector('[data-action="close-modal"]').addEventListener('click', closeModal)
}

function renderInfoModal() {
  state.activeModal = 'info'
  modalRoot.classList.remove('hidden')
  modalRoot.innerHTML = `
    <div class="modal-card info-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="info-title">
      <div class="modal-header">
        <div>
          <p class="eyebrow">Handcrafted info</p>
          <h2 id="info-title">About the tower collection</h2>
        </div>
        <button type="button" class="close-button" data-action="close-modal" aria-label="Close info">×</button>
      </div>

      <div class="info-body">
        <section>
          <h3>About</h3>
          <p>Japanese Tower Chess pairs a bright glassmorphism board with a set of iconic Japanese towers reimagined as chibi chess pieces. The goal is to bring a premium, playful, 3D board to the browser without depending on a backend.</p>
          <p>Play a standard two-player game using legal chess moves. Select a piece, move to a legal destination, and watch the board react with check, checkmate, stalemate, and special-move indicators.</p>
        </section>

        <section>
          <h3>Tower collection</h3>
          <div class="tower-grid">
            ${TOWER_OPTIONS.map(getTowerInfoCard).join('')}
          </div>
        </section>

        <section>
          <h3>Credits</h3>
          <p>Procedural tower models are used as in-project fallbacks while original GLB assets are prepared for production. The project uses Three.js for rendering, chess.js for legal rules, and Vite for static site packaging.</p>
          <ul class="credit-list">
            <li><strong>Coding:</strong> LLM Copilot</li>
            <li><strong>3D modeling:</strong> Claude</li>
            <li><strong>Three.js:</strong> MIT license</li>
            <li><strong>chess.js:</strong> MIT license</li>
            <li><strong>Vite:</strong> MIT license</li>
          </ul>
        </section>

        <section>
          <h3>Share</h3>
          <button type="button" class="primary-btn" data-action="share-site">Share website</button>
        </section>
      </div>
    </div>
  `

  modalRoot.querySelector('[data-action="close-modal"]').addEventListener('click', closeModal)
  modalRoot.querySelectorAll('[data-tower-thumbnail]').forEach((image) => {
    createTowerThumbnail(image.dataset.towerThumbnail).then((thumbnail) => {
      image.src = thumbnail
    })
  })
  modalRoot.querySelector('[data-action="share-site"]').addEventListener('click', async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Japanese Tower Chess', text: 'Play Japanese Tower Chess', url })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        showToast('Website link copied.')
      } else {
        window.prompt('Copy this URL:', url)
      }
    } catch {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        showToast('Website link copied.')
      }
    }
  })
}

function closeModal() {
  modalRoot.classList.add('hidden')
  modalRoot.innerHTML = ''
  state.activeModal = null
}

function resetGame() {
  const hasProgress = state.game.history().length > 0 && !state.game.isGameOver()
  if (hasProgress) {
    state.activeModal = 'confirm-reset'
    modalRoot.classList.remove('hidden')
    modalRoot.innerHTML = `
      <div class="modal-card glass-panel" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div>
            <p class="eyebrow">Reset current game?</p>
            <h2>Start a fresh board</h2>
          </div>
        </div>
        <p>This will clear the current game and restore the standard opening position.</p>
        <div class="modal-actions">
          <button type="button" class="secondary-btn" data-action="cancel-reset">Cancel</button>
          <button type="button" class="primary-btn" data-action="confirm-reset">Confirm reset</button>
        </div>
      </div>
    `

    modalRoot.querySelector('[data-action="cancel-reset"]').addEventListener('click', closeModal)
    modalRoot.querySelector('[data-action="confirm-reset"]').addEventListener('click', () => {
      state.game = createGameState()
      state.selectedSquare = null
      state.legalMoves = []
      state.lastMove = null
      renderPieces()
      renderHighlights()
      updateStatusStrip()
      closeModal()
    })
    return
  }

  state.game = createGameState()
  state.selectedSquare = null
  state.legalMoves = []
  state.lastMove = null
  renderPieces()
  renderHighlights()
  updateStatusStrip()
}

function handleBoardClick(event) {
  const hit = intersectBoard(event)
  if (!hit) return

  const square = hit.object.userData.square ?? hit.object.parent?.userData.square ?? null
  if (!square) return

  const piece = state.game.get(square)
  if (!piece) {
    if (handleMoveAttempt(square)) {
      return
    }

    state.selectedSquare = null
    state.legalMoves = []
    renderHighlights()
    return
  }

  if (piece.color === state.game.turn()) {
    state.selectedSquare = square
    state.legalMoves = getLegalMoves(state.game, square)
    renderHighlights()
    return
  }

  if (handleMoveAttempt(square)) {
    return
  }
}

function intersectBoard(event) {
  const rect = renderer.domElement.getBoundingClientRect()
  const pointer = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  )

  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects(boardGroup.children, true)
  return hits.find((hit) => hit.object.userData.square || hit.object.parent?.userData.square) ?? null
}

const dragState = {
  active: false,
  startX: 0,
  startY: 0,
  dragged: false,
  pieceHit: false,
}

const activePointers = new Map()
let pinchDistance = null

function scheduleRender() {
  if (!scheduleRender.renderQueued) {
    scheduleRender.renderQueued = true
    requestAnimationFrame(() => {
      scheduleRender.renderQueued = false
      renderer.render(scene, camera)
    })
  }
}

renderer.domElement.addEventListener('pointerdown', (event) => {
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (activePointers.size > 1) {
    dragState.active = false
    dragState.dragged = true
    pinchDistance = getPointerDistance()
    return
  }
  dragState.active = true
  dragState.startX = event.clientX
  dragState.startY = event.clientY
  dragState.dragged = false
  dragState.pieceHit = !!intersectBoard(event)?.object.userData.piece
})

renderer.domElement.addEventListener('pointermove', (event) => {
  if (activePointers.has(event.pointerId)) {
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  }
  if (activePointers.size > 1) {
    const nextDistance = getPointerDistance()
    if (pinchDistance) {
      orbit.distance = THREE.MathUtils.clamp(orbit.distance - (nextDistance - pinchDistance) * 0.025, 10, 26)
      state.settings.camera.distance = orbit.distance
      updateCamera()
    }
    pinchDistance = nextDistance
    return
  }
  if (!dragState.active) return
  const dx = event.clientX - dragState.startX
  const dy = event.clientY - dragState.startY
  if (!dragState.pieceHit && (Math.abs(dx) + Math.abs(dy) > 8)) {
    dragState.dragged = true
    orbit.yaw -= dx * 0.005
    orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + dy * 0.004, 0.2, 1.5)
    updateCamera()
    dragState.startX = event.clientX
    dragState.startY = event.clientY
  }
})

renderer.domElement.addEventListener('pointerup', (event) => {
  activePointers.delete(event.pointerId)
  if (activePointers.size === 0) {
    pinchDistance = null
  }
  if (!dragState.dragged && activePointers.size === 0) {
    handleBoardClick(event)
  }
  dragState.active = false
})

renderer.domElement.addEventListener('pointercancel', (event) => {
  activePointers.delete(event.pointerId)
  pinchDistance = activePointers.size > 1 ? getPointerDistance() : null
  dragState.active = false
})

renderer.domElement.addEventListener('pointerleave', () => {
  dragState.active = false
})

function getPointerDistance() {
  const pointers = [...activePointers.values()]
  if (pointers.length < 2) return 0
  return Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y)
}

function updateCamera() {
  const x = orbit.target.x + orbit.distance * Math.cos(orbit.pitch) * Math.sin(orbit.yaw)
  const y = orbit.target.y + orbit.distance * Math.sin(orbit.pitch)
  const z = orbit.target.z + orbit.distance * Math.cos(orbit.pitch) * Math.cos(orbit.yaw)
  camera.position.set(x, y, z)
  camera.lookAt(orbit.target)
  scheduleRender()
}

renderer.domElement.addEventListener('wheel', (event) => {
  event.preventDefault()
  orbit.distance = THREE.MathUtils.clamp(orbit.distance + event.deltaY * 0.01, 10, 26)
  state.settings.camera.distance = orbit.distance
  updateCamera()
}, { passive: false })

function resizeRenderer() {
  const { clientWidth, clientHeight } = sceneContainer
  renderer.setSize(clientWidth, clientHeight, false)
  camera.aspect = clientWidth / clientHeight
  camera.updateProjectionMatrix()
  updateCamera()
}

window.addEventListener('resize', resizeRenderer)

function renderBoard() {
  createBoardSquares()
  updateBoardAppearance()
  renderPieces()
  renderHighlights()
  updateStatusStrip()
  scheduleRender()
}

function attachUiHandlers() {
  document.querySelector('#reset-btn').addEventListener('click', resetGame)
  document.querySelector('#settings-btn').addEventListener('click', renderSettingsModal)
  document.querySelector('#info-btn').addEventListener('click', renderInfoModal)
}

function setupKeyboard() {
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal()
    }
  })
}

function init() {
  attachUiHandlers()
  setupKeyboard()
  renderBoard()
  updateCamera()
  resizeRenderer()
  updateStatusStrip()
  scheduleRender()
}

init()
