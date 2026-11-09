import Phaser from 'phaser';
import raw from './m3d-r3-art.generated.json' with { type: 'json' };
import shaolin from './shaolin-quyen-art.json' with { type: 'json' };
import type { RasterComponent, RasterAnimation } from './skill-art-registry.js';
import { rasterAnimationKey } from './skill-art-registry.js';
export type R3Direction = 'right' | 'down' | 'left' | 'up';
export type R3Tag = RasterAnimation & {
  loop: boolean;
  durationMsTotal: number;
};
type Component = Omit<RasterComponent, 'animations'> & {
  sourceId: string;
  animations: R3Tag[];
};
export const r3Assets = [
  ...raw.assets,
  ...shaolin.assets,
] as unknown as Component[];
const components = new Map(r3Assets.map((c) => [c.sourceId, c]));
export const r3NailAxis = raw.nailAxis;
export function r3Tag(
  asset: string,
  phase: string,
  direction?: R3Direction,
): { asset: Component; tag: R3Tag } {
  const c = components.get(asset);
  const tag =
    c?.animations.find(
      (a) => a.name === (direction ? `${phase}_${direction}` : phase),
    ) ?? c?.animations.find((a) => a.name === phase);
  if (!c || !tag)
    throw Error(`Unapproved r3 animation ${asset}/${phase}/${direction ?? ''}`);
  return { asset: c, tag };
}
export function r3Frame(
  tag: R3Tag,
  elapsed: number,
  duration?: number,
  loop = tag.loop,
): string {
  let t = loop
    ? Math.max(0, elapsed) % tag.durationMsTotal
    : Math.min(
        tag.durationMsTotal - 0.001,
        (Math.max(0, elapsed) / (duration ?? tag.durationMsTotal)) *
          tag.durationMsTotal,
      );
  for (let i = 0; i < tag.frames.length; i++) {
    if (t < tag.frameDurationsMs![i]!) return tag.frames[i]!;
    t -= tag.frameDurationsMs![i]!;
  }
  return tag.frames.at(-1)!;
}
export interface R3PaintOptions {
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  alpha?: number;
  pivot?: readonly number[];
  rotation?: number;
  mirrorX?: boolean;
  depth?: number;
  duration?: number;
  loop?: boolean;
  placement?: boolean;
}
export class R3Painter {
  private readonly views = new Map<string, Phaser.GameObjects.Image>();
  private readonly used = new Set<string>();
  readonly observed = new Map<string, Set<string>>();
  readonly timings: Array<{
    id: string;
    asset: string;
    tag: string;
    frame: string;
    at: number;
  }> = [];
  constructor(private readonly scene: Phaser.Scene) {}
  begin(): void {
    this.used.clear();
  }
  observe(texture: string, frame: string): void {
    const c = r3Assets.find((a) => a.id === texture),
      tag = c?.animations.find((a) => a.frames.includes(frame));
    if (!tag) return;
    const id = texture + ':' + tag.name,
      set = this.observed.get(id) ?? new Set<string>();
    const first = !set.has(frame);
    set.add(frame);
    this.observed.set(id, set);
    if (first && this.timings.length < 1500)
      this.timings.push({
        id: 'body',
        asset: texture,
        tag: tag.name,
        frame,
        at: this.scene.time.now,
      });
  }
  draw(
    id: string,
    asset: string,
    phase: string,
    d: R3Direction | undefined,
    x: number,
    y: number,
    elapsed: number,
    o: R3PaintOptions = {},
  ): Phaser.GameObjects.Image {
    const { asset: c, tag } = r3Tag(asset, phase, d),
      frame = r3Frame(tag, elapsed, o.duration, o.loop);
    let view = this.views.get(id);
    if (!view) {
      view = this.scene.add.image(x, y, c.id, frame).setName('r3:' + id);
      this.views.set(id, view);
    }
    const previous = String(view.frame.name),
      previousTexture = view.texture.key;
    const pivot = o.pivot ?? [
      tag.origin[0] * c.frameDimensions[0],
      tag.origin[1] * c.frameDimensions[1],
    ];
    const offset = o.placement ? tag.effectPlacementOffset : [0, 0];
    const scale = o.scale ?? 1;
    const ox = offset[0]! * (o.mirrorX ? -1 : 1),
      oy = offset[1]!,
      a = o.rotation ?? 0;
    view
      .setTexture(c.id, frame)
      .setOrigin(
        pivot[0]! / c.frameDimensions[0],
        pivot[1]! / c.frameDimensions[1],
      )
      .setPosition(
        Math.round(x + ox * Math.cos(a) - oy * Math.sin(a)),
        Math.round(y + ox * Math.sin(a) + oy * Math.cos(a)),
      )
      .setScale(o.scaleX ?? scale, o.scaleY ?? scale)
      .setFlipX(!!o.mirrorX)
      .setRotation(o.rotation ?? 0)
      .setAlpha(o.alpha ?? 1)
      .setDepth(o.depth ?? y + 2);
    this.used.add(id);
    const set = this.observed.get(c.id + ':' + tag.name) ?? new Set<string>();
    set.add(frame);
    this.observed.set(c.id + ':' + tag.name, set);
    if (
      (previous !== frame || previousTexture !== c.id) &&
      this.timings.length < 1500
    )
      this.timings.push({
        id,
        asset: c.id,
        tag: tag.name,
        frame,
        at: this.scene.time.now,
      });
    return view;
  }
  end(): void {
    for (const [id, view] of this.views)
      if (!this.used.has(id)) {
        view.destroy();
        this.views.delete(id);
      }
  }
  clear(): void {
    for (const view of this.views.values()) view.destroy();
    this.views.clear();
    this.used.clear();
  }
  inspect() {
    return {
      frames: Object.fromEntries(
        [...this.observed].map(([k, v]) => [k, [...v]]),
      ),
      timings: this.timings,
      entities: [...this.views].map(([id, v]) => ({
        id,
        asset: v.texture.key,
        frame: String(v.frame.name),
        x: v.x,
        y: v.y,
        origin: [v.originX, v.originY],
        scale: [v.scaleX, v.scaleY],
        rotation: v.rotation,
        depth: v.depth,
      })),
    };
  }
}
/** A state-sampled body frame; its clock is the authoritative action, not Phaser callbacks. */
export function r3Body(
  scene: Phaser.Scene,
  asset: string,
  phase: string,
  d: R3Direction,
  elapsed: number,
  duration: number,
  token: string,
  loop = false,
) {
  const { asset: c, tag } = r3Tag(asset, phase, d),
    frame = r3Frame(tag, elapsed, duration, loop);
  const animation = rasterAnimationKey(c.id, tag.name) + ':cel:' + frame;
  if (!scene.anims.exists(animation))
    scene.anims.create({
      key: animation,
      frames: [{ key: c.id, frame }],
      frameRate: 1,
      repeat: 0,
    });
  return {
    texture: c.id,
    animation,
    origin: tag.origin,
    firstFrame: frame,
    scale: 1,
    token: 'feedback:r3:' + token + ':' + frame,
    durationMs: duration,
    timeScale: 1,
    startFrame: 0,
  };
}
