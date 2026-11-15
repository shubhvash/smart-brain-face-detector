// Copies the MediaPipe WASM runtime into public/ so face detection is fully
// self-hosted (no CDN, no external API). Runs before `npm run dev` / `npm run build`.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const dest = path.join(__dirname, '..', 'public', 'mediapipe-wasm');

fs.mkdirSync(dest, { recursive: true });
for (const file of fs.readdirSync(src)) {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
}
console.log(`Copied MediaPipe WASM runtime to ${path.relative(process.cwd(), dest)}`);
