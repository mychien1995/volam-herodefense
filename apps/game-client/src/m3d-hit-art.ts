import Phaser from 'phaser';
import type { CombatEvent } from '@volam/game-core';
import { approvedM3dPresentation } from './m3d-approved-boss-body.js';

const atlas = 'm3d-hit-impact';
const path = '/assets/m3d-hit-continuity/impact';
// The approved preview is in display pixels. The match draws these assets
// at the same half-world-scale as its native character textures.
const impactScale = 0.5;
const sparkMs = 110;
const crackMs = 210;
const targetData = 'm3d-impact-target';
const maxContours = 96;
type Body = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
type Hit = {
  event: CombatEvent;
  start?: number;
  spark: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Image | undefined;
  outline: Phaser.GameObjects.Image | undefined;
};

export function preloadM3dHitArt(scene: Phaser.Scene): void {
  if (approvedM3dPresentation())
    scene.load.atlas(atlas, path + '.png', path + '.json');
}

export function markImpactTarget(body: Body | undefined, id: string): void {
  if (body && body.data?.get(targetData) !== id) body.setData(targetData, id);
}

function drawContour(
  frame: Phaser.Textures.Frame,
  canvas: HTMLCanvasElement,
  padding: number,
) {
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(
    frame.source.image as CanvasImageSource,
    frame.cutX,
    frame.cutY,
    frame.cutWidth,
    frame.cutHeight,
    padding,
    padding,
    frame.cutWidth,
    frame.cutHeight,
  );
  const { width, height } = canvas;
  const source = context.getImageData(0, 0, width, height).data;
  const edge = context.createImageData(width, height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const original = source[i + 3]!;
      if (original === 255) continue;
      let maxAlpha = original;
      for (
        let dy = Math.max(0, y - padding);
        dy <= Math.min(height - 1, y + padding);
        dy++
      )
        for (
          let dx = Math.max(0, x - padding);
          dx <= Math.min(width - 1, x + padding);
          dx++
        )
          maxAlpha = Math.max(maxAlpha, source[(dy * width + dx) * 4 + 3]!);
      if (maxAlpha === original) continue;
      edge.data[i] = 255;
      edge.data[i + 1] = 223;
      edge.data[i + 2] = 156;
      edge.data[i + 3] = Math.round((maxAlpha - original) * 0.75);
    }
  context.putImageData(edge, 0, 0);
}

export class M3dHitArt {
  private readonly hits = new Map<string, Hit>();
  private readonly contours = new Map<string, Phaser.Textures.CanvasTexture>();
  private nextContour = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  hit(event: CombatEvent): boolean {
    if (
      event.kind !== 'hit' ||
      event.damage <= 0 ||
      !event.targetId ||
      event.targetId === 'statue' ||
      !this.scene.textures.exists(atlas)
    )
      return false;
    const secondary = (event.hitIndex ?? 0) > 0;
    const previous = this.hits.get(event.targetId);
    if (previous) this.destroy(previous);
    const spark = this.scene.add
      .image(event.x, event.y, atlas, 'spark-0')
      .setVisible(false)
      .setScale(impactScale * (secondary ? 0.77 : event.critical ? 1.12 : 1))
      .setAlpha(secondary ? 0.79 : 1);
    const ring =
      event.critical && !secondary
        ? this.scene.add
            .image(event.x, event.y, atlas, 'crack-0')
            .setScale(impactScale)
            .setVisible(false)
        : undefined;
    this.hits.set(event.targetId, {
      event,
      spark,
      ring,
      outline: undefined,
    });
    return true;
  }

  private destroy(hit: Hit) {
    hit.spark.destroy();
    hit.ring?.destroy();
    hit.outline?.destroy();
  }

  clear(): void {
    for (const hit of this.hits.values()) this.destroy(hit);
    this.hits.clear();
    for (const texture of this.contours.values())
      this.scene.textures.remove(texture);
    this.contours.clear();
  }

  private contour(body: Body, padding: number) {
    const frame = body.frame;
    if (frame.rotated || !frame.cutWidth || !frame.cutHeight) return;
    const id = JSON.stringify([body.texture.key, frame.name, padding]);
    const cached = this.contours.get(id);
    if (cached) {
      this.contours.delete(id);
      this.contours.set(id, cached);
      return cached;
    }
    const texture = this.scene.textures.createCanvas(
      'm3d-impact-contour-' + this.nextContour++,
      frame.cutWidth + padding * 2,
      frame.cutHeight + padding * 2,
    );
    if (!texture) return;
    drawContour(frame, texture.getCanvas(), padding);
    texture.refresh();
    this.contours.set(id, texture);
    return texture;
  }

  private placeOutline(hit: Hit, body: Body, age: number) {
    const padding = Math.max(
      1,
      Math.round(impactScale / Math.abs(body.scaleX)),
    );
    const texture = this.contour(body, padding);
    if (!texture) return;
    const outline = (hit.outline ??= this.scene.add.image(
      body.x,
      body.y,
      texture.key,
    ));
    if (outline.texture !== texture) outline.setTexture(texture.key);
    const frame = body.frame;
    const x = body.flipX ? frame.realWidth - frame.x - frame.width : frame.x;
    const y = body.flipY ? frame.realHeight - frame.y - frame.height : frame.y;
    outline
      .setPosition(body.x, body.y)
      .setDisplayOrigin(
        body.displayOriginX - x + padding,
        body.displayOriginY - y + padding,
      )
      .setDepth(body.depth - 0.1)
      .setScale(body.scaleX, body.scaleY)
      .setRotation(body.rotation)
      .setFlip(body.flipX, body.flipY)
      .setAlpha(body.alpha * 0.88 * (1 - age / sparkMs))
      .setVisible(true);
  }

  sync(): void {
    if (!this.hits.size) return;
    const targets = new Map<string, Body>();
    for (const node of this.scene.children.list) {
      const id = node.data?.get(targetData) as string | undefined;
      if (!id || !this.hits.has(id)) continue;
      const body = node as Body;
      if (body.visible && body.alpha > 0 && body.scaleX && body.scaleY)
        targets.set(id, body);
    }
    for (const [id, hit] of this.hits) {
      hit.start ??= this.scene.time.now;
      const age = Math.max(0, this.scene.time.now - hit.start);
      if (age >= (hit.ring ? crackMs : sparkMs)) {
        this.destroy(hit);
        this.hits.delete(id);
        continue;
      }
      const body = targets.get(id);
      const { x, y, fx, fy } = hit.event;
      const contactX = (body?.x ?? x) - 6 * (fx ?? 1);
      const height = body
        ? Math.max(
            18,
            (body.displayOriginY - body.frame.y) * Math.abs(body.scaleY),
          )
        : 43;
      const contactY = (body?.y ?? y) - height * 0.46 - 2.5 * (fy ?? 0);
      hit.spark.setVisible(age < sparkMs);
      if (age < sparkMs) {
        hit.spark
          .setFrame('spark-' + Math.floor(age / (sparkMs / 4)))
          .setPosition(contactX, contactY)
          .setDepth((body?.depth ?? y) + 0.4);
        if (body) this.placeOutline(hit, body, age);
        else hit.outline?.setVisible(false);
      } else hit.outline?.setVisible(false);
      if (hit.ring) {
        const crack = age < 27 ? 0 : age < 72 ? 1 : age < 135 ? 2 : 3;
        hit.ring
          .setFrame('crack-' + crack)
          .setPosition(x, y + 3 * impactScale)
          .setDepth(y - 2)
          .setAlpha(age < 100 ? 1 : 1 - (age - 100) / 110)
          .setVisible(true);
      }
    }
    if (this.contours.size > maxContours) {
      const inUse = new Set(
        [...this.hits.values()].map((hit) => hit.outline?.texture),
      );
      for (const [id, texture] of this.contours) {
        if (this.contours.size <= maxContours) break;
        if (inUse.has(texture)) continue;
        this.contours.delete(id);
        this.scene.textures.remove(texture);
      }
    }
  }

  inspect() {
    return [...this.hits.values()].map(({ event, spark, ring, outline }) => ({
      id: event.id,
      target: event.targetId,
      critical: event.critical,
      spark: spark.visible ? spark.frame.name : undefined,
      ring: ring?.visible ? ring.frame.name : undefined,
      outline: !!outline?.visible,
    }));
  }
}
