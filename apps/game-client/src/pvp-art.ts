import Phaser from 'phaser';
import { pvpDefinition } from '@volam/game-data';
import type { LobbyState } from '@volam/game-protocol';
import type { PvpMapId, PvpSnapshot } from '@volam/game-core';
import manifest from '../../../assets/exports/pvp/manifest.json';
import { PvpSwordArt } from './pvp-sword-art.js';
import { drawLoiDai } from './loi-dai-art.js';
export const pvpView = (
  state: LobbyState | undefined,
): PvpSnapshot | undefined => {
  if (!state?.pvp.enabled || !state.pvp.json) return;
  return JSON.parse(state.pvp.json) as PvpSnapshot;
};
const key = (id: string) => 'standalone-pvp:' + id;
export function preloadPvpArt(scene: Phaser.Scene): void {
  for (const file of manifest.files)
    scene.load.image(key(file.file), '/assets/pvp/' + file.file);
}
export function fitPvpCamera(scene: Phaser.Scene, id: PvpMapId): void {
  const m = pvpDefinition.maps[id];
  // Same native gameplay scale as Defense; cover and clamp the map instead of shrinking it.
  const nativeZoom =
    scene.scale.width >= 960 && scene.scale.height >= 600 ? 2 : 1;
  scene.cameras.main.setBounds(0, 0, m.width, m.height);
  scene.cameras.main.setZoom(
    Math.max(
      nativeZoom,
      scene.scale.width / m.width,
      scene.scale.height / m.height,
    ),
  );
  scene.cameras.main.centerOn(m.width / 2, m.height / 2);
}
export function drawPvpMap(scene: Phaser.Scene, id: PvpMapId): void {
  if (id === 'hong_moc') drawLoiDai(scene);
  else {
    const m = manifest.maps[id],
      map = pvpDefinition.maps[id];
    for (const layer of m.layers)
      scene.add
        .image(0, 0, key(layer.file))
        .setOrigin(0)
        .setDisplaySize(map.width, map.height)
        .setDepth(layer.depth)
        .setName('pvp-map:' + id + ':' + layer.id);
  }
  fitPvpCamera(scene, id);
}
export class PvpArt {
  private readonly effects = new Map<number, Phaser.GameObjects.Image>();
  private readonly swords = new Map<number, PvpSwordArt>();
  private npc: Phaser.GameObjects.Image | undefined;
  private npcName: Phaser.GameObjects.Text | undefined;
  private readonly markers = new Map<string, Phaser.GameObjects.Image>();
  private lava: Phaser.GameObjects.TileSprite | undefined;
  private maskShape: Phaser.GameObjects.Graphics | undefined;
  private mask:
    Phaser.Filters.Mask | Phaser.Display.Masks.GeometryMask | undefined;
  private frame = -1;
  constructor(private scene: Phaser.Scene) {}
  sync(v: PvpSnapshot, now: number, state: LobbyState): void {
    const s = this.scene,
      m = pvpDefinition.maps[v.mapId];
    const marked = new Set<string>();
    for (const member of v.members) {
      const h = state.players.get(member.id);
      if (member.team === 'spectator' || !h || h.hp <= 0 || v.phase === 'lobby')
        continue;
      marked.add(member.id);
      let image = this.markers.get(member.id);
      if (!image) {
        image = s.add
          .image(h.x, h.y, key('lightning-warning.png'))
          .setDisplaySize(30, 17)
          .setAlpha(0.7)
          .setName('pvp-team:' + member.id);
        this.markers.set(member.id, image);
      }
      image
        .setPosition(h.x, h.y)
        .setDepth(h.y - 12)
        .setTint(member.team === 'chinh' ? 0x56c9ee : 0xed7064)
        .setTintMode(Phaser.TintModes.FILL);
    }
    for (const [id, image] of this.markers)
      if (!marked.has(id)) {
        image.destroy();
        this.markers.delete(id);
      }
    if (v.mapId === 'kiem_ho') {
      if (!this.npc)
        this.npc = s.add
          .image(m.width / 2, m.height / 2, key('doc-co-0.png'))
          .setOrigin(0.5, 80 / 96)
          .setName('pvp-doc-co-cau-bai')
          .setDepth(m.height / 2);
      if (!this.npcName)
        this.npcName = s.add
          .text(m.width / 2, m.height / 2 - 69, 'Độc Cô Cầu Bại', {
            fontFamily: 'Segoe UI',
            fontSize: '10px',
            color: '#ffe4a2',
            backgroundColor: '#202219c0',
            padding: { x: 4, y: 2 },
          })
          .setOrigin(0.5, 1)
          .setDepth(m.height / 2 + 80);
      let frame = Math.floor(v.tick / 10) % 2;
      const sword = v.hazards.find((h) => h.kind === 'sword'),
        lightning = v.hazards.find((h) => h.kind === 'lightning');
      if (sword)
        frame =
          v.tick < sword.armedAt
            ? 2
            : Math.min(4, 3 + Math.floor((v.tick - sword.armedAt) / 6));
      else if (lightning)
        frame =
          v.tick < lightning.armedAt
            ? Math.min(
                6,
                5 + Math.floor((v.tick - lightning.armedAt + 36) / 18),
              )
            : Math.min(9, 7 + Math.floor((v.tick - lightning.armedAt) / 4));
      if (frame !== this.frame) {
        this.frame = frame;
        this.npc.setTexture(key('doc-co-' + frame + '.png'));
      }
    }
    if (v.mapId === 'dia_nguc' && v.safe && v.hazardsEnabled) {
      if (!this.lava) {
        this.lava = s.add
          .tileSprite(0, 0, m.width, m.height, key('lava-material.png'))
          .setOrigin(0)
          .setTileScale(0.5)
          .setDepth(-105)
          .setName('pvp-lava');
        this.maskShape = s.add.graphics().setVisible(false);
        if (s.game.renderer.type === Phaser.WEBGL) {
          this.lava.enableFilters();
          this.mask = this.lava.filters!.external.addMask(
            this.maskShape,
            false,
            s.cameras.main,
          );
        } else {
          this.mask = this.maskShape.createGeometryMask();
          this.lava.setMask(this.mask);
        }
      }
      const shape = this.maskShape!.clear().fillStyle(0xffffff);
      for (let y = 0; y < m.height; y += 4) {
        const dy = (y + 2 - v.safe.y) / v.safe.ry;
        if (Math.abs(dy) >= 1) shape.fillRect(0, y, m.width, 4);
        else {
          const dx = v.safe.rx * Math.sqrt(1 - dy * dy);
          shape.fillRect(0, y, v.safe.x - dx, 4);
          shape.fillRect(v.safe.x + dx, y, m.width - v.safe.x - dx, 4);
        }
      }
      this.lava.tilePositionX = now / 150;
      this.lava.tilePositionY = now / 350;
    }
    const active = new Set<number>();
    for (const h of v.hazards) {
      active.add(h.id);
      const warning = v.tick < h.armedAt;
      const cel =
        h.kind === 'dart'
          ? 'dart'
          : h.kind === 'arrow'
            ? 'arrow-' + (Math.floor(v.tick / 4) % 2)
            : warning
              ? h.kind + '-warning'
              : h.kind +
                '-' +
                Math.min(2, Math.floor((v.tick - h.armedAt) / 4));
      let image = this.effects.get(h.id);
      if (!image) {
        image = s.add
          .image(h.x, h.y, key(cel + '.png'))
          .setName('pvp-hazard:' + h.id);
        this.effects.set(h.id, image);
      }
      image
        .setTexture(key(cel + '.png'))
        .setPosition(h.x, h.y)
        .setDepth(warning ? -5 : h.y + 100);
      if (h.kind === 'sword') {
        let sword = this.swords.get(h.id);
        if (!sword) {
          sword = new PvpSwordArt(s, m, h, image);
          this.swords.set(h.id, sword);
        }
        sword.sync(h, v.tick, now);
      } else if (h.kind === 'lightning')
        image
          .setOrigin(0.5, warning ? 0.5 : 1)
          .setDisplaySize(
            warning ? h.radius * 2.4 : 76,
            warning ? h.radius * 2.5 : 130,
          )
          .setAlpha(warning ? 0.8 : 1);
      else
        image
          .setOrigin(0.5)
          .setDisplaySize(
            h.kind === 'dart' ? 36 : 50,
            h.kind === 'dart' ? 17 : 28,
          )
          .setRotation(Math.atan2(h.vy, h.vx));
    }
    for (const [id, image] of this.effects)
      if (!active.has(id)) {
        if (this.swords.get(id)?.retain(now)) continue;
        this.swords.get(id)?.destroy();
        this.swords.delete(id);
        image.destroy();
        this.effects.delete(id);
      }
  }
  inspect() {
    return {
      npcFrame: this.frame,
      npcTexture: this.npc?.texture.key,
      hazards: [...this.effects.entries()].map(([id, i]) => ({
        id,
        alpha: i.alpha,
        texture: i.texture.key,
        x: i.x,
        y: i.y,
        visible: i.visible,
        scale: [i.scaleX, i.scaleY],
        size: [i.displayWidth, i.displayHeight],
      })),
      swords: [...this.swords.values()].map((s) => s.inspect()),
      lava: !!this.lava,
    };
  }
  clear(): void {
    for (const sword of this.swords.values()) sword.destroy();
    this.swords.clear();
    for (const image of this.effects.values()) image.destroy();
    this.effects.clear();
    for (const image of this.markers.values()) image.destroy();
    this.markers.clear();
    this.npcName?.destroy();
    this.npcName = undefined;
    this.npc?.destroy();
    this.lava?.destroy();
    this.maskShape?.destroy();
    this.npc = undefined;
    this.lava = undefined;
    this.mask = undefined;
    this.maskShape = undefined;
    this.frame = -1;
  }
}
