import { assetUrl } from './asset-url.js';
import Phaser from 'phaser';
const icons: Record<string, string> = {
  stun: 'star',
  root: 'root',
  silence: 'silence',
  disarm: 'disarm',
  dash_lock: 'dash-lock',
  slow: 'slow',
  attack_slow: 'attack-slow',
  defense_break: 'defense-break',
  attack_break: 'attack-break',
  poison: 'poison',
  burn: 'burn',
};
const priority = Object.keys(icons);
export function preloadStatusPresentation(scene: Phaser.Scene): void {
  for (const name of new Set(Object.values(icons)))
    scene.load.image(
      'm4d-status-' + name,
      assetUrl(`/assets/m4d/status-v02/${name}/prop.png`),
    );
}
/** Presentation follows replicated statuses, never predicts a hit or dispel. */
export class StatusPresentation {
  private views = new Map<string, Phaser.GameObjects.Image[]>();
  private active = new Set<string>();
  constructor(private scene: Phaser.Scene) {}
  begin(): void {
    this.active.clear();
  }
  sync(
    id: string,
    sprite: Phaser.GameObjects.Sprite,
    top: number,
    statuses: Array<{ kind: string; ticks?: number }>,
    hp: number,
  ): void {
    const kinds =
      hp > 0
        ? priority
            .filter((k) =>
              statuses.some((s) => s.kind === k && (s.ticks ?? 1) > 0),
            )
            .slice(0, 3)
        : [];
    if (!kinds.length || !sprite.visible || sprite.alpha < 0.1) return;
    this.active.add(id);
    let nodes = this.views.get(id);
    if (!nodes) {
      nodes = [];
      this.views.set(id, nodes);
    }
    const needed = kinds.reduce((n, k) => n + (k === 'stun' ? 3 : 1), 0);
    while (nodes.length < needed)
      nodes.push(
        this.scene.add
          .image(0, 0, 'm4d-status-star')
          .setName('m4d:status:' + id),
      );
    let i = 0;
    kinds.forEach((kind, slot) => {
      const count = kind === 'stun' ? 3 : 1;
      const cx = sprite.x + (slot - (kinds.length - 1) / 2) * 22;
      for (let star = 0; star < count; star++) {
        const node = nodes![i++]!,
          angle = this.scene.time.now / 180 + (star * Math.PI * 2) / 3;
        node.setTexture('m4d-status-' + icons[kind]);
        const size = kind === 'stun' ? 8 : 15;
        node
          .setScale(size / Math.max(node.width, node.height))
          .setAlpha(sprite.alpha)
          .setPosition(
            cx + (count > 1 ? Math.cos(angle) * 11 : 0),
            top + (count > 1 ? Math.sin(angle) * 3 : 0),
          )
          .setDepth(sprite.y + 500)
          .setVisible(true)
          .setData('status-kind', kind);
      }
    });
    for (; i < nodes.length; i++) nodes[i]!.setVisible(false);
  }
  end(): void {
    for (const [id, nodes] of this.views)
      if (!this.active.has(id)) {
        for (const node of nodes) node.destroy();
        this.views.delete(id);
      }
  }
  clear(): void {
    for (const nodes of this.views.values())
      for (const node of nodes) node.destroy();
    this.views.clear();
  }
  inspect() {
    return [...this.views].map(([id, nodes]) => ({
      id,
      icons: nodes
        .filter((n) => n.visible)
        .map((n) => ({ kind: n.getData('status-kind'), x: n.x, y: n.y })),
    }));
  }
}
