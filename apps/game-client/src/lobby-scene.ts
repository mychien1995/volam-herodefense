import Phaser from 'phaser';

export interface RosterEntry {
  id: string;
  nickname: string;
  checks: number;
}

/** Original geometric placeholder. Positions are lobby layout, not game state. */
export class LobbyScene extends Phaser.Scene {
  private roster: RosterEntry[] = [];
  private labels: Phaser.GameObjects.Container | undefined;

  constructor() {
    super('Lobby');
  }

  create(): void {
    const g = this.add.graphics();
    g.fillStyle(0x15282c).fillRect(0, 0, 800, 480);
    g.lineStyle(1, 0x244044);
    for (let x = 0; x <= 800; x += 32) g.lineBetween(x, 0, x, 480);
    for (let y = 0; y <= 480; y += 32) g.lineBetween(0, y, 800, y);
    g.fillStyle(0x33413d).fillRect(0, 208, 800, 64).fillRect(368, 0, 64, 480);
    g.fillStyle(0x233b3d).fillRect(288, 128, 224, 224);
    g.lineStyle(2, 0x617268).strokeRect(288, 128, 224, 224);
    g.fillStyle(0x708177).fillRect(368, 264, 64, 24);
    g.fillStyle(0xa0ac94).fillRect(380, 202, 40, 62);
    g.fillStyle(0xc7c9a1).fillCircle(400, 190, 15);
    this.add
      .text(400, 320, 'COURTYARD PLACEHOLDER', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#acb7a6',
      })
      .setOrigin(0.5);
    this.labels = this.add.container();
    this.drawRoster();
    document.querySelector('#scene-status')?.setAttribute('data-ready', 'true');
  }

  setRoster(roster: RosterEntry[]): void {
    this.roster = roster;
    this.drawRoster();
  }

  private drawRoster(): void {
    if (!this.labels) return;
    this.labels.removeAll(true);
    const spots = [
      [240, 160],
      [560, 160],
      [240, 300],
      [560, 300],
      [336, 384],
      [464, 384],
    ] as const;
    for (const [index, player] of this.roster.entries()) {
      const [x, y] = spots[index] ?? [400, 400];
      const marker = this.add
        .rectangle(x, y, 18, 24, 0xd7b777)
        .setStrokeStyle(2, 0xf5dfac);
      const label = this.add
        .text(x, y + 24, player.nickname, {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#f4efdc',
          backgroundColor: '#111e25',
          padding: { x: 5, y: 3 },
        })
        .setOrigin(0.5, 0);
      this.labels.add([marker, label]);
    }
  }
}
