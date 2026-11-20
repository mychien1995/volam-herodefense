import Phaser from 'phaser';
import type { LobbyState } from '@volam/game-protocol';
import type { WorldDepthProfile } from './world-depth-profiles.js';
import { facing } from './facing.js';
import { impactTargetId } from './m3d-hit-art.js';
type Image = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
type Actor = {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
};
type View = {
  source: Image;
  original: Actor['shadow'] | undefined;
  originalVisible: boolean;
  contact: Image;
  cast: Image;
  key: string;
  kind: string;
};
type Cast = {
  key: string;
  ox: number;
  oy: number;
  factor: number;
  bytes: number;
  at: number;
};
const maxBytes = 24 * 1024 * 1024,
  maxCasts = 64,
  maxTextures = 128;
export class WorldDepthShadows {
  private views = new Map<string, View>();
  private cache = new Map<string, Cast>();
  private zone = '';
  private serial = 0;
  private enabled = true;
  private bytes = 0;
  private clipped = 0;
  private edgeChecks = 0;
  private audited = new Set<string>();
  private seen = new Set<string>();
  constructor(private scene: Phaser.Scene) {}
  private image(texture: string, depth: number): Image {
    return this.scene.add
      .image(0, 0, texture)
      .setName('world-depth:shadow')
      .setDepth(depth);
  }
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    for (const v of this.views.values()) {
      v.contact.setVisible(enabled && v.source.visible);
      v.cast.setVisible(enabled && !!v.key && v.source.visible);
      if (v.original?.scene)
        v.original.setVisible(enabled ? false : v.originalVisible);
    }
  }
  private projection(
    source: Image,
    id: string,
    direction: string,
    p: WorldDepthProfile,
    anchor?: [number, number],
  ): Cast {
    const identity =
      p.id + ':' + id + ':' + source.texture.key + ':' + direction;
    const existing = this.cache.get(identity);
    if (existing) {
      existing.at = ++this.serial;
      return existing;
    }
    const names = source.texture.getFrameNames();
    const idle = names.find((n) => /idle/.test(n) && n.includes(direction));
    const frame = idle ? source.texture.get(idle) : source.frame;
    const lx = frame.x - frame.realWidth * (anchor?.[0] ?? source.originX),
      ly = frame.y - frame.realHeight * (anchor?.[1] ?? source.originY);
    const corners = [
      [lx, ly],
      [lx + frame.cutWidth, ly],
      [lx, ly + frame.cutHeight],
      [lx + frame.cutWidth, ly + frame.cutHeight],
    ].map(([x, y]) => [x! - p.direction[0] * y!, -p.direction[1] * y!]);
    const left = Math.floor(Math.min(...corners.map((v) => v[0]!))) - 14,
      top = Math.floor(Math.min(...corners.map((v) => v[1]!))) - 14;
    const width = Math.ceil(Math.max(...corners.map((v) => v[0]!))) - left + 14,
      height = Math.ceil(Math.max(...corners.map((v) => v[1]!))) - top + 14;
    const factor = Math.min(1, 384 / width, 192 / height),
      w = Math.ceil(width * factor),
      h = Math.ceil(height * factor);
    const key = 'world-depth:generic-cast:' + ++this.serial;
    const tex = this.scene.textures.createCanvas(key, w, h)!,
      ctx = tex.context;
    const ink = document.createElement('canvas');
    ink.width = frame.cutWidth;
    ink.height = frame.cutHeight;
    const paint = ink.getContext('2d')!;
    paint.drawImage(
      frame.source.image as CanvasImageSource,
      frame.cutX,
      frame.cutY,
      frame.cutWidth,
      frame.cutHeight,
      0,
      0,
      frame.cutWidth,
      frame.cutHeight,
    );
    paint.globalCompositeOperation = 'source-in';
    paint.fillStyle = '#241f1a';
    paint.fillRect(0, 0, ink.width, ink.height);
    ctx.scale(factor, factor);
    ctx.translate(-left, -top);
    ctx.filter = `blur(${3 * factor}px)`;
    ctx.transform(1, 0, -p.direction[0], -p.direction[1], 0, 0);
    ctx.drawImage(ink, lx, ly);
    tex.refresh();
    const result = {
      key,
      ox: (-left * factor) / w,
      oy: (-top * factor) / h,
      factor,
      bytes: w * h * 4,
      at: this.serial,
    };
    this.cache.set(identity, result);
    this.bytes += result.bytes;
    return result;
  }
  sync(
    state: LobbyState | undefined,
    zone: string,
    actors: ReadonlyMap<string, Actor>,
    p: WorldDepthProfile,
    skip: ReadonlySet<string>,
  ): void {
    if (zone !== this.zone) {
      this.clear();
      this.zone = zone;
    }
    const sources = new Map<
      string,
      {
        source: Image;
        entity?: { hp: number; fx: number; fy: number; zoneId: string };
        original?: Actor['shadow'];
        kind: string;
        identity: string;
      }
    >();
    state?.players.forEach((h, id) => {
      const v = actors.get(id);
      if (v && h.zoneId === zone && !skip.has(id))
        sources.set(id, {
          source: v.sprite,
          entity: h,
          original: v.shadow,
          kind: 'hero',
          identity: h.basicId,
        });
    });
    state?.creeps.forEach((h, id) => {
      const v = actors.get(id);
      if (v && h.zoneId === zone && !skip.has(id))
        sources.set(id, {
          source: v.sprite,
          entity: h,
          original: v.shadow,
          kind: h.ownerId ? 'summon' : 'creep',
          identity: h.archetypeId,
        });
    });
    for (const node of this.scene.children.list) {
      const image = node as Image;
      if (
        !image.texture ||
        !image.visible ||
        image.alpha <= 0.01 ||
        image.name.startsWith('world-depth:')
      )
        continue;
      const target = impactTargetId(node);
      if (target && !skip.has(target)) {
        const old = sources.get(target);
        sources.set(target, {
          ...old,
          source: image,
          kind: old?.kind ?? 'boss',
          identity: old?.identity ?? target,
        });
      }
      const prop =
        (image.getData('renovation-world') ||
          image.getData('world-depth-prop')) &&
        !/ground|portal|exit|water|bridge_deck/.test(
          image.name + ':' + image.texture.key,
        ) &&
        image.depth > p.groundDepth + 25;
      if (prop && !/^art01:(statue_male|lantern)/.test(image.name) && !target)
        sources.set('prop:' + image.name + ':' + image.x + ':' + image.y, {
          source: image,
          kind: 'prop',
          identity: image.texture.key + ':' + image.frame.name,
        });
    }
    const active = new Set<string>(),
      pins = new Set<string>();
    let castCount = 0;
    const castBudget = Math.max(0, maxCasts - skip.size);
    const camera = this.scene.cameras.main.worldView;
    const ordered = [...sources].sort(
      (a, b) =>
        Phaser.Math.Distance.Squared(
          a[1].source.x,
          a[1].source.y,
          camera.centerX,
          camera.centerY,
        ) -
        Phaser.Math.Distance.Squared(
          b[1].source.x,
          b[1].source.y,
          camera.centerX,
          camera.centerY,
        ),
    );
    for (const [id, { source, entity, original, kind, identity }] of ordered) {
      active.add(id);
      this.seen.add(kind + ':' + identity);
      let v = this.views.get(id);
      if (!v) {
        v = {
          source,
          original,
          originalVisible: original?.visible ?? true,
          contact: this.image('world-depth:shadow', p.groundDepth),
          cast: this.image('world-depth:shadow', p.groundDepth + 0.1),
          key: '',
          kind,
        };
        this.views.set(id, v);
      }
      v.source = source;
      const alive =
        source.visible && source.alpha > 0.01 && (!entity || entity.hp > 0);
      const x = entity
        ? source.x
        : source.x + (0.5 - source.originX) * source.displayWidth;
      const y = entity
        ? (original?.y ?? source.y)
        : source.y + (1 - source.originY) * source.displayHeight;
      const visible =
        this.enabled &&
        alive &&
        x > camera.x - 100 &&
        x < camera.right + 100 &&
        y > camera.y - 120 &&
        y < camera.bottom + 100;
      if (original?.scene)
        original.setVisible(this.enabled ? false : v.originalVisible);
      const size = Phaser.Math.Clamp(
        (source.getData('hero-motion-active')
          ? source.getData('hero-motion-body-width')
          : source.frame.cutWidth) *
          Math.abs(source.scaleX) *
          0.7,
        16,
        110,
      );
      v.contact
        .setPosition(x, y)
        .setDisplaySize(size, Math.max(6, size * 0.22))
        .setAlpha(0.29 * source.alpha)
        .setVisible(visible);
      v.cast.setVisible(false);
      if (visible && castCount++ < castBudget) {
        const shadow = this.projection(
          source,
          identity,
          entity
            ? (source.getData('hero-motion-direction') ??
                facing(entity.fx, entity.fy))
            : 'static',
          p,
          kind === 'prop' ? [0.5, 1] : undefined,
        );
        pins.add(shadow.key);
        v.key = shadow.key;
        v.cast
          .setTexture(shadow.key)
          .setOrigin(shadow.ox, shadow.oy)
          .setPosition(x, entity ? y + 3 : y)
          .setScale(
            source.scaleX / shadow.factor,
            source.scaleY / shadow.factor,
          )
          .setAlpha(p.cast * source.alpha)
          .setVisible(true);
      }
    }
    for (const [id, v] of this.views)
      if (!active.has(id)) {
        this.remove(v);
        this.views.delete(id);
      }
    for (const [id, c] of [...this.cache].sort((a, b) => a[1].at - b[1].at)) {
      if (this.bytes <= maxBytes && this.cache.size <= maxTextures) break;
      if (!pins.has(c.key)) {
        this.scene.textures.remove(c.key);
        this.cache.delete(id);
        this.bytes -= c.bytes;
      }
    }
  }
  private remove(v: View): void {
    if (v.original?.scene) v.original.setVisible(v.originalVisible);
    v.contact.destroy();
    v.cast.destroy();
  }
  /** Explicit QA readback, never called from a render/update path. */
  auditEdges(): { checked: number; clipped: number } {
    for (const c of this.cache.values()) {
      if (this.audited.has(c.key)) continue;
      const tex = this.scene.textures.get(
        c.key,
      ) as Phaser.Textures.CanvasTexture;
      const { width: w, height: h } = tex.canvas;
      const data = tex.context.getImageData(0, 0, w, h).data;
      let clipped = false;
      for (let x = 0; x < w; x++)
        if (data[x * 4 + 3] || data[((h - 1) * w + x) * 4 + 3]) clipped = true;
      for (let y = 0; y < h; y++)
        if (data[y * w * 4 + 3] || data[(y * w + w - 1) * 4 + 3])
          clipped = true;
      this.audited.add(c.key);
      this.edgeChecks++;
      if (clipped) this.clipped++;
    }
    return { checked: this.edgeChecks, clipped: this.clipped };
  }
  inspect() {
    return {
      actors: [...this.views].map(([id, v]) => ({
        id,
        kind: v.kind,
        visible: v.contact.visible,
        cast: v.cast.visible,
        x: v.contact.x,
        y: v.contact.y,
      })),
      cached: this.cache.size,
      bytes: this.bytes,
      maxBytes,
      maxCasts,
      clipped: this.clipped,
      edgeChecks: this.edgeChecks,
      seen: [...this.seen],
    };
  }
  clear(): void {
    for (const v of this.views.values()) this.remove(v);
    this.views.clear();
    for (const c of this.cache.values()) this.scene.textures.remove(c.key);
    this.cache.clear();
    this.bytes = 0;
    this.zone = '';
  }
}
