import Phaser from 'phaser';
import {
  bossSkillNames,
  bossBanterLines,
  waveBossFarewells,
} from '@volam/game-data';
import {
  bossSkillAnnouncementSeconds,
  type CombatEvent,
  type BacCaiView,
} from '@volam/game-core';
import type { LobbyState } from '@volam/game-protocol';

/** One server-authored announcement per special cast, shared by arena and dungeons. */
export class BossSkillAnnouncements {
  private labels = new Map<
    string,
    {
      text: Phaser.GameObjects.Text;
      tick: number;
      name: string;
      at: number;
      anchor: { x: number; y: number };
      sourceId: string;
      banter: boolean;
      farewell: boolean;
    }
  >();
  private observed: Array<{
    sourceId: string;
    abilityId: string;
    name: string;
    tick: number;
  }> = [];
  constructor(private scene: Phaser.Scene) {}
  event(event: CombatEvent): boolean {
    const banter = event.stage === 'boss_banter';
    const farewell = event.stage === 'boss_farewell';
    if (!banter && !farewell && event.stage !== 'boss_shout') return false;
    const name = farewell
      ? (waveBossFarewells as Readonly<Record<string, string>>)[event.abilityId]
      : (banter ? bossBanterLines : bossSkillNames)[event.abilityId];
    if (!name) return true;
    const shout = this.labels.get(event.sourceId);
    if (
      banter &&
      shout &&
      this.scene.time.now - shout.at < bossSkillAnnouncementSeconds * 1000
    )
      return true;
    if (!banter) {
      const dialogueKey = event.sourceId + ':banter';
      this.labels.get(dialogueKey)?.text.destroy();
      this.labels.delete(dialogueKey);
      if (farewell) {
        shout?.text.destroy();
        this.labels.delete(event.sourceId);
      }
    }
    const key = event.sourceId + (banter || farewell ? ':banter' : '');
    const old = this.labels.get(key);
    const text =
      old?.text ??
      this.scene.add
        .text(0, 0, '', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '14px',
          color: '#fff1bc',
          stroke: '#151b14',
          strokeThickness: 2,
          align: 'center',
          wordWrap: { width: 300, useAdvancedWrap: true },
        })
        .setOrigin(0.5, 1)
        .setName(
          (banter
            ? 'boss-banter:'
            : farewell
              ? 'boss-farewell:'
              : 'boss-shout:') + event.sourceId,
        );
    text.setName(
      (banter ? 'boss-banter:' : farewell ? 'boss-farewell:' : 'boss-shout:') +
        event.sourceId,
    );
    text.setResolution(this.textResolution());
    text.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    text.setText(name.normalize('NFC'));
    this.labels.set(key, {
      sourceId: event.sourceId,
      banter,
      farewell,
      text,
      tick: event.tick ?? 0,
      name,
      at: this.scene.time.now,
      anchor: { x: event.x, y: event.y },
    });
    this.observed.push({
      sourceId: event.sourceId,
      abilityId: event.abilityId,
      name,
      tick: event.tick ?? 0,
    });
    if (this.observed.length > 128) this.observed.shift();
    return true;
  }
  private textResolution(): number {
    return Math.min(
      6,
      Math.max(
        2,
        Math.ceil(
          this.scene.cameras.main.zoom * (window.devicePixelRatio || 1),
        ),
      ),
    );
  }
  sync(state: LobbyState | undefined, zone: string) {
    if (!this.labels.size) return;
    const raw = zone === 'arena' ? state?.bacCai.get('arena')?.snapshot : '';
    const bc = raw ? (JSON.parse(raw) as BacCaiView) : null;
    const camera = this.scene.cameras.main;
    const hud = document.getElementById('boss-hud');
    const topInset =
      hud && !hud.hidden
        ? (hud.offsetTop + hud.offsetHeight + 10) / camera.zoom
        : 12;
    for (const [key, v] of this.labels) {
      const id = v.sourceId;
      const lifetime = v.farewell
        ? 4.7
        : v.banter
          ? 4
          : bossSkillAnnouncementSeconds;
      const resolution = this.textResolution();
      if (v.text.style.resolution !== resolution)
        v.text.setResolution(resolution);
      const actor =
          id === 'bac_cai' &&
          bc &&
          bc.phase !== 'cleared' &&
          bc.phase !== 'defeated'
            ? { ...(bc.boss ?? v.anchor), zoneId: 'arena', hp: bc.hp }
            : state?.creeps.get(id),
        age = (this.scene.time.now - v.at) / 1000;
      if (
        (!v.farewell && (!actor || actor.zoneId !== zone || actor.hp <= 0)) ||
        (v.farewell && zone !== 'arena') ||
        age >= lifetime
      ) {
        v.text.destroy();
        this.labels.delete(key);
        continue;
      }
      const position = v.farewell ? v.anchor : actor!;
      const dialogue = v.banter || v.farewell;
      let x = position.x;
      const darkNamDe =
        id === 'boss_nam_de' &&
        !!JSON.parse(state?.defense.namDe || 'null')?.dark;
      let y =
        position.y -
        (darkNamDe ? 70 : 0) -
        (dialogue ? 116 : 85) -
        10 * Math.min(1, Math.max(0, age / 0.35));
      const view = camera.worldView;
      v.text.setVisible(view.contains(position.x, position.y));
      const inset = Math.min(v.text.width / 2 + 8, view.width / 2);
      x = Phaser.Math.Clamp(x, view.left + inset, view.right - inset);
      y = Math.max(y, view.top + v.text.height + topInset);
      v.text
        .setPosition(Math.round(x), Math.round(y))
        .setDepth(position.y + 220)
        .setAlpha(
          1 - Math.max(0, Math.min(1, (age - (lifetime - 0.35)) / 0.35)),
        );
    }
  }
  clear() {
    for (const v of this.labels.values()) v.text.destroy();
    this.labels.clear();
  }
  inspect() {
    return {
      active: [...this.labels].map(([, v]) => ({
        sourceId: v.sourceId,
        banter: v.banter,
        farewell: v.farewell,
        name: v.name,
        x: v.text.x,
        y: v.text.y,
        alpha: v.text.alpha,
        visible: v.text.visible,
        resolution: v.text.style.resolution,
        fontSize: v.text.style.fontSize,
      })),
      observed: this.observed,
    };
  }
}
