import Phaser from 'phaser';
import { actorSheets, facings, poses, preloadArt, registerArt } from './art.js';
/** Presentation-only asset inspection route: ?artPreview=1. Never changes room state. */
export class ArtPreviewScene extends Phaser.Scene {
  private sprites: Phaser.GameObjects.Sprite[] = [];
  constructor() {
    super('ArtPreview');
  }
  preload(): void {
    preloadArt(this);
  }
  create(): void {
    registerArt(this);
    this.cameras.main.setBackgroundColor('#4b6453');
    this.add.text(
      10,
      4,
      'M1 ORIGINAL PROTOTYPE · FOUR FACINGS · ACTUAL PNG/ATLAS',
      { fontFamily: 'monospace', fontSize: '9px', color: '#f9e5b6' },
    );
    actorSheets.forEach((sheet, family) => {
      const offset = 28 + family * 240;
      this.add.text(10, offset, sheet.id, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#f9e5b6',
      });
      poses.forEach((pose, column) => {
        this.add.text(5 + column * 78, offset + 16, pose, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#f9e5b6',
        });
        facings.forEach((direction, row) =>
          this.sprites.push(
            this.add
              .sprite(35 + column * 78, offset + 76 + row * 48, sheet.id)
              .setOrigin(0.5, 1)
              .play(`${sheet.id}:${pose}:${direction}`),
          ),
        );
      });
    });
    document.querySelector('#scene-status')?.setAttribute('data-ready', 'true');
  }
  inspect() {
    return {
      ready: this.sprites.length === 48,
      sprites: this.sprites.map((sprite) => ({
        animation: sprite.anims.currentAnim?.key,
        frame: sprite.frame.name,
        total: sprite.anims.currentAnim?.frames.length,
      })),
    };
  }
}
