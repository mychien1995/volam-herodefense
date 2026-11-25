// Read-only loader audit. This page is tooling, never part of the game bundle.
import Phaser from 'phaser';
import { ArenaScene } from '../apps/game-client/src/arena-scene.ts';
const paths = new Set(),
  failures = [];
function capture(file) {
  if (typeof file.url !== 'string') return;
  const url = new URL(file.url, location.href);
  if (url.pathname.startsWith('/assets/')) paths.add(decodeURI(url.pathname));
  // Parse real packs/atlas JSON and execute the real ADD/replacement handlers,
  // but avoid decoding every dungeon's huge raster into memory simultaneously.
  // This establishes reachability; visual QA must use the original PNGs.
  if (file.type === 'image') file.url = '/__deploy-audit-pixel.png';
}
class Audit extends ArenaScene {
  constructor() {
    super(true);
  }
  preload() {
    super.preload();
    for (const file of this.load.list) capture(file);
    this.load.on(Phaser.Loader.Events.ADD, (_key, _type, _loader, file) =>
      capture(file),
    );
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file) =>
      failures.push({ url: file.url, type: file.type }),
    );
  }
  create() {
    window.__deployLoaderAudit = {
      paths: [...paths].sort(),
      failures,
      complete: true,
    };
  }
  update() {}
}
new Phaser.Game({
  type: Phaser.HEADLESS,
  width: 320,
  height: 240,
  banner: false,
  audio: { noAudio: true },
  scene: [Audit],
});
