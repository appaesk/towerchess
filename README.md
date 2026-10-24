# Japanese Tower Chess

A lightweight, client-side chess experience built with Vite, Three.js, and chess.js. Play chess on a glassmorphism 3D board with Japanese tower-inspired pieces.

Play online: [Japanese Tower Chess on GitHub Pages](https://appaesk.github.io/towerchess/)

## Features

- Three.js 3D chessboard and Japanese tower pieces
- Legal chess moves via chess.js
- Reset confirmation and game-over summary modal
- Settings panel with local persistence
- Custom board, piece, camera, and tower assignment settings
- Responsive icon controls and mobile pinch-to-zoom
- About page with tower previews, downloads, maps, and official links
- Procedural fallback tower models for missing external assets

## Architecture

- `src/main.js`: board scene, event handling, UI overlays, controls, and rendering
- `src/chessLogic.js`: chess rules wrapper around chess.js
- `src/settings.js`: settings normalization and localStorage persistence
- `src/towerModels.js`: procedural tower-model generation
- `public/assets/model-manifest.json`: model manifest and asset attribution ledger

## Asset checklist and replacement guidance

The project includes tower assets and procedural fallbacks. Any replacement GLB or glTF assets should be optimized, licensed, and attributed.

Recommended replacement pipeline:

1. Prepare optimized low-poly tower models.
2. Normalize the pivot to the base center and keep a 1-unit scale.
3. Save assets in `public/assets/`.
4. Update `src/towerModels.js` or loader logic to replace the procedural fallback.
5. Record licenses and source attribution in the manifest and README.

## Tower collection notes

The collection includes:

- Tokyo Tower
- Tokyo Skytree
- Fukuoka Tower
- Chubu Electric Power MIRAI TOWER
- Nidec Kyoto Tower
- Kobe Port Tower
- Tsutenkaku
- Yokohama Marine Tower
- Sapporo TV Tower

Heights are approximate and intended for informational display; where relevant, structural height is used rather than observation-deck height.

## Credits

- **Coding:** LLM Copilot
- **3D modeling:** Claude
