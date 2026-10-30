import Phaser from 'phaser';
import {
  actorFootPivot,
  actorSheets,
  facings,
  poses,
  preloadArt,
  registerArt,
} from './art.js';
/** Presentation-only asset inspection route: ?artPreview=1. Never changes room state. */
export class ArtPreviewScene extends Phaser.Scene {
  private sprites: Phaser.GameObjects.Sprite[] = [];
  private expected = 48;
  constructor() {
    super('ArtPreview');
  }
  preload(): void {
    preloadArt(this);
  }
  create(): void {
    registerArt(this);
    this.cameras.main.setBackgroundColor('#4b6453');
    if (new URLSearchParams(location.search).has('caiBangReview')) {
      this.expected = 24;
      this.add.text(12, 12, 'CAI BANG · BONG SWEEP + CHUONG', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#f9e5b6',
      });
      this.add.text(
        12,
        34,
        'Approved initial baseline · same hero · normal-attack styles',
        {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#f9e5b6',
        },
      );
      this.add.text(120, 57, 'BONG', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#f9e5b6',
      });
      this.add.text(332, 57, 'CHUONG', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#f9e5b6',
      });
      for (const [style, sheet] of [
        'hero_cai_bang',
        'hero_cai_bang_chuong',
      ].entries()) {
        ['idle', 'walk', 'basic_attack'].forEach((pose, column) => {
          const x = (style === 0 ? 80 : 300) + column * 70;
          const label =
            pose === 'basic_attack' ? (style === 0 ? 'Sweep' : 'Palm') : pose;
          this.add.text(x - 20, 83, label, {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#f9e5b6',
          });
          facings.forEach((direction, row) => {
            if (column === 0 && style === 0)
              this.add.text(12, 126 + row * 100, direction, {
                fontFamily: 'monospace',
                fontSize: '10px',
                color: '#f9e5b6',
              });
            this.sprites.push(
              this.add
                .sprite(x, 160 + row * 100, sheet)
                .setOrigin(...actorFootPivot(this, sheet))
                .play({
                  key: `${sheet}:${pose}:${direction}`,
                  repeat: -1,
                  repeatDelay: pose === 'basic_attack' ? 400 : 0,
                }),
            );
          });
        });
      }
      document
        .querySelector('#scene-status')
        ?.setAttribute('data-ready', 'true');
      return;
    }
    this.add.text(
      10,
      4,
      'CAI BANG ART REVIEW · 3 AUTHORED STATES · OTHER POSES REUSE FRAMES',
      { fontFamily: 'monospace', fontSize: '9px', color: '#f9e5b6' },
    );
    // Keep the original actor/creep diagnostic layout; both hero styles have the dedicated review above.
    actorSheets
      .filter((sheet) => sheet.id !== 'hero_cai_bang_chuong')
      .forEach((sheet, family) => {
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
                .setOrigin(...actorFootPivot(this, sheet.id))
                .play(`${sheet.id}:${pose}:${direction}`),
            ),
          );
        });
      });
    document.querySelector('#scene-status')?.setAttribute('data-ready', 'true');
  }
  inspect() {
    return {
      ready: this.sprites.length === this.expected,
      sprites: this.sprites.map((sprite) => ({
        animation: sprite.anims.currentAnim?.key,
        frame: sprite.frame.name,
        total: sprite.anims.currentAnim?.frames.length,
      })),
    };
  }
}
