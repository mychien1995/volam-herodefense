import Phaser from 'phaser';
/** Environment composition study only. No zone, travel, collision or combat state. */
export class ForestStudyScene extends Phaser.Scene {
  constructor() {
    super('ForestStudy');
  }
  create(): void {
    this.add.tileSprite(800, 600, 1600, 1152, 'terrain', 0).setDepth(-10000);
    this.add.tileSprite(800, 650, 1600, 100, 'water').setDepth(-9999);
    this.add.tileSprite(800, 600, 90, 700, 'terrain', 2).setDepth(-9998);
    this.add.image(800, 650, 'bridge').setDepth(-9997);
    this.add.image(800, 570, 'courtyard_seal').setAlpha(0.5).setDepth(-9996);
    for (const [x, y] of [
      [530, 450],
      [590, 600],
      [1050, 470],
      [1080, 760],
      [540, 820],
      [990, 860],
      [730, 380],
      [950, 360],
    ] as const)
      this.add.image(x, y, 'tree').setOrigin(0.5, 1).setDepth(y);
    for (const [x, y] of [
      [650, 470],
      [1020, 620],
      [610, 780],
      [920, 790],
    ] as const)
      this.add.image(x, y, 'blossom').setOrigin(0.5, 1).setDepth(y);
    for (let i = 0; i < 15; i++) {
      const x = 510 + ((i * 73) % 600),
        y = 410 + ((i * 59) % 430);
      this.add.image(x, y, 'bamboo').setOrigin(0.5, 1).setDepth(y);
    }
    for (const [x, y] of [
      [735, 600],
      [865, 600],
      [735, 720],
      [865, 720],
    ] as const)
      this.add.image(x, y, 'lantern').setOrigin(0.5, 1).setDepth(y);
    this.add.image(800, 430, 'dungeon_gate').setOrigin(0.5, 1).setDepth(430);
    this.add
      .sprite(800, 710, 'hero_cai_bang', 'idle_up_0')
      .setOrigin(0.5, 1)
      .setDepth(710)
      .play('hero_cai_bang:idle:up');
    this.add
      .text(800, 725, 'Art scale guide · no gameplay', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#eedbad',
        backgroundColor: '#263c30',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 0)
      .setDepth(726);
    this.cameras.main
      .setBounds(0, 0, 1600, 1152)
      .setZoom(1)
      .setRotation(0)
      .centerOn(800, 620);
    this.cameras.main.roundPixels = true;
  }
}
