# Tower assets

This project intentionally works without external 3D asset files by generating stylised procedural tower models as a fallback. The platform is designed to accept GLB/gltf replacements later without changing the gameplay logic.

## Recommended production asset pipeline

1. Gather public-domain or licensed tower references and produce low-poly GLB files.
2. Normalize each model to a 1-unit scale and set the pivot to the base center.
3. Keep materials monochrome or near-monochrome with a glass-like finish.
4. Export optimized GLB files with compressed textures and limited triangle counts.
5. Replace the procedural fallback in `src/towerModels.js` with asset loaders if real models are added later.

## Asset checklist

- Each tower should have a dedicated model file.
- Each file should include a base pivot aligned with the board surface.
- Models should use shared materials to reduce draw calls.
- The total scene should remain lightweight on mobile.
- Files should be uploaded to `public/assets/` and referenced through relative paths.

## License notes

Use only assets with clear attribution and distribution rights. If a public model is used, record the source and license in the project README and keep licenses in a `licenses/` folder when needed.
