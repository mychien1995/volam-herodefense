import Phaser from 'phaser';
import {
  actorFootPivot,
  actorSheets,
  facings,
  poses,
  preloadActorArt,
  registerActorArt,
} from './art.js';
/** Presentation-only asset inspection route: ?artPreview=1. Never changes room state. */
export class ArtPreviewScene extends Phaser.Scene {
  private sprites: Phaser.GameObjects.Sprite[] = [];
  private expected = 48;
  constructor() {
    super('ArtPreview');
  }
  preload(): void {
    preloadActorArt(this);
  }
  create(): void {
    registerActorArt(this);
    this.cameras.main.setBackgroundColor('#4b6453');
    const thienSonReview = new URLSearchParams(location.search).has(
      'thienSonReview',
    );
    const voDangReview = new URLSearchParams(location.search).has(
      'voDangReview',
    );
    const thieuLamReview = new URLSearchParams(location.search).has(
      'thieuLamReview',
    );
    if (
      thienSonReview ||
      voDangReview ||
      thieuLamReview ||
      new URLSearchParams(location.search).has('caiBangReview')
    ) {
      this.expected = 24;
      this.add.text(
        12,
        12,
        thieuLamReview
          ? 'THIEU LAM · QUYEN + BROAD CURVED DAO'
          : voDangReview
            ? 'VO DANG · QUYEN + STRAIGHT SWORD'
            : thienSonReview
              ? 'THIEN SON · FAN + CURVED DAO'
              : 'CAI BANG · BONG SWEEP + CHUONG',
        {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#f9e5b6',
        },
      );
      this.add.text(
        12,
        34,
        thieuLamReview
          ? 'APPROVED v01 · four-facing idle/walk/Quyen/Dao'
          : voDangReview
            ? 'APPROVED v01 · four-facing idle/walk/Quyen/Kiem'
            : thienSonReview
              ? 'APPROVED v01 · four-facing idle/walk/fan/dao'
              : 'Approved initial baseline · same hero · normal-attack styles',
        {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#f9e5b6',
        },
      );
      this.add.text(
        120,
        57,
        thieuLamReview || voDangReview
          ? 'QUYEN'
          : thienSonReview
            ? 'FAN'
            : 'BONG',
        {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#f9e5b6',
        },
      );
      this.add.text(
        thieuLamReview ? 420 : 332,
        57,
        voDangReview
          ? 'KIEM'
          : thieuLamReview || thienSonReview
            ? 'DAO'
            : 'CHUONG',
        {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#f9e5b6',
        },
      );
      for (const [style, sheet] of (thieuLamReview
        ? ['hero_thieu_lam', 'hero_thieu_lam_dao']
        : voDangReview
          ? ['hero_vo_dang', 'hero_vo_dang_kiem']
          : thienSonReview
            ? ['hero_thien_son', 'hero_thien_son_dao']
            : ['hero_cai_bang', 'hero_cai_bang_chuong']
      ).entries()) {
        ['idle', 'walk', 'basic_attack'].forEach((pose, column) => {
          const x = thieuLamReview
            ? (style === 0 ? 80 : 360) + column * 90
            : (style === 0 ? 80 : 300) + column * 70;
          const label =
            pose === 'basic_attack'
              ? thienSonReview || voDangReview || thieuLamReview
                ? 'attack'
                : style === 0
                  ? 'Sweep'
                  : 'Palm'
              : pose;
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
      .filter(
        (sheet) => sheet.id === 'hero_cai_bang' || sheet.id === 'creep_outlaw',
      )
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
        frameRate: sprite.anims.currentAnim?.frameRate,
        playing: sprite.anims.isPlaying,
        x: sprite.x,
        y: sprite.y,
        origin: [sprite.originX, sprite.originY],
        scale: [sprite.scaleX, sprite.scaleY],
      })),
    };
  }
}
