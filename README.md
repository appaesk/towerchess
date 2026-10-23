# Japanese Tower Chess

A lightweight, client-side chess experience built with Vite, Three.js, and chess.js. The app presents a glassmorphism 3D board with Japanese tower-inspired chibi pieces, supports legal chess moves, and can be deployed to GitHub Pages without a backend.

## Features

- Three.js 3D board and tower pieces
- Legal chess moves via chess.js
- Reset confirmation flow and game-over summary modal
- Settings panel with local persistence
- Tower assignment preferences and custom colors
- Information modal with tower cards and share support
- GitHub Pages-safe routing using relative asset paths
- Fallback procedural tower models for missing external assets

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev -- --host 0.0.0.0
   ```
3. Open the local URL shown in the terminal.

## Production build

```bash
npm run build
```

The build output is created in the `dist` folder.

## GitHub Pages deployment

This project is configured for repository-based deployment by setting the Vite base path to `./` in `vite.config.js`.

### One-time GitHub Pages setup

1. Push the project to a GitHub repository.
2. Open the repository settings.
3. Go to Pages.
4. Choose the branch and folder for deployment, or use a custom GitHub Action if preferred.
5. Ensure the site is served from the repository root or a `gh-pages` branch.

### Example GitHub Pages flow

If using a static branch deployment:

```bash
npm run build
```

Then upload the contents of `dist` to the Pages branch or configure your deployment workflow to publish `dist` automatically.

## Architecture

- `src/main.js`: board scene, event handling, UI overlays, controls
- `src/chessLogic.js`: chess rules wrapper around chess.js
- `src/settings.js`: settings normalization and localStorage persistence
- `src/towerModels.js`: procedural tower-model generation
- `public/assets/model-manifest.json`: model manifest and asset attribution ledger

## Asset checklist and replacement guidance

The project ships with procedural tower fallbacks instead of proprietary 3D models. Real GLB or glTF assets may be added later.

Recommended replacement pipeline:

1. Prepare optimized low-poly tower models.
2. Normalize the pivot to the base center and keep a 1-unit scale.
3. Save assets in `public/assets/`.
4. Update `src/towerModels.js` or loader logic to replace the procedural fallback.
5. Record licenses and source attribution in the manifest and README.

## Tower collection notes

This project includes nine tower variants in the collection and settings palette:

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

## Testing

```bash
npm test
```

The test suite covers standard chess rules, game termination, persistence validation, and reset behavior.

## License notes

This project uses open-source libraries with permissive licenses (MIT). External model files should be used only with valid licensing and attribution.

## Credits

- **Coding:** LLM Copilot
- **3D modeling:** Claude
