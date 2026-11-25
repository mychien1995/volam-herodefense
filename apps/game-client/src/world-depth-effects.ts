import {
  depthLightStyle,
  type DepthLightStyle,
} from './world-depth-light-policy.js';
import { WorldDepthEnvironment } from './world-depth-environment.js';
import { WorldDepthShadows } from './world-depth-shadows.js';
import { depthProfile } from './world-depth-profiles.js';
import { createDepthTerrain } from './world-depth-terrain.js';
import { DepthEmissionPoints } from './world-depth-emission.js';
import { facing } from './facing.js';
import Phaser from 'phaser';
import type { LobbyState } from '@volam/game-protocol';

type Image = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
type Actor = {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
};
type ActorShadow = {
  source: Actor;
  kind: 'hero' | 'dog';
  originalVisible: boolean;
  contact: Image;
  cast: Image;
};
type FireLight = {
  source?: Image;
  ground: Image;
  halo: Image;
  core: Image;
  ability: string;
};

/** Client-only world presentation. These textures describe illumination, never artwork/hitboxes. */
export const worldDepthConfig = {
  contactOpacity: 0.32,
  castOpacity: 0.2,
  shadowDirection: { x: 0.62, y: 0.3 },
  lanternIntensity: 0.32,
  fireIntensity: 0.3,
  maxFireLights: 16,
};

export class WorldDepthEffects {
  enabled = new URLSearchParams(location.search).get('visualDepth') !== 'off';
  private zone = '';
  private activeProfile: ReturnType<typeof depthProfile> | undefined;
  private actors = new Map<string, ActorShadow>();
  private props: Image[] = [];
  private terrain: Image[] = [];
  private readonly emission = new DepthEmissionPoints();
  private heroShadows = new Map<string, string>();
  private dogShadows = new Map<string, string>();
  private clippedShadows = new Set<string>();
  private lanterns: { source: Image; ground: Image; glow: Image }[] = [];
  private lights: FireLight[] = [];
  private textures = new Set<string>();
  private observed = new Set<string>();
  private disposed = false;
  private readonly expandedShadows: WorldDepthShadows;
  private readonly environment: WorldDepthEnvironment;
  private readonly key = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (
      event.code !== 'F8' ||
      event.repeat ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      target?.isContentEditable ||
      /^(INPUT|SELECT|TEXTAREA)$/.test(target?.tagName ?? '')
    )
      return;
    event.preventDefault();
    this.setEnabled(!this.enabled);
  };

  constructor(private scene: Phaser.Scene) {
    this.expandedShadows = new WorldDepthShadows(scene);
    this.environment = new WorldDepthEnvironment(scene);
    window.addEventListener('keydown', this.key);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);
  }
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.expandedShadows.setEnabled(enabled);
    this.environment.setEnabled(enabled);
    for (const shadow of this.actors.values()) {
      if (shadow.source.shadow.scene)
        shadow.source.shadow.setVisible(
          enabled ? false : shadow.originalVisible,
        );
      shadow.contact.setVisible(enabled);
      shadow.cast.setVisible(enabled);
    }
    for (const image of this.props)
      image.setVisible(
        enabled && !!image.getData('world-depth:source')?.visible,
      );
    for (const image of this.terrain) image.setVisible(enabled);
    for (const lamp of this.lanterns) {
      lamp.ground.setVisible(enabled);
      lamp.glow.setVisible(enabled);
    }
    for (const light of this.lights) {
      light.ground.setVisible(enabled && !!light.source);
      light.halo.setVisible(enabled && !!light.source);
      light.core.setVisible(enabled && !!light.source);
    }
  }
  private radial(key: string, warm: boolean): string {
    if (this.scene.textures.exists(key)) return key;
    const texture = this.scene.textures.createCanvas(key, 128, 128)!;
    const ctx = texture.context;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 62);
    if (key === 'world-depth:hot') {
      gradient.addColorStop(0, 'rgba(255,255,228,1)');
      gradient.addColorStop(0.12, 'rgba(255,249,196,0.95)');
      gradient.addColorStop(0.28, 'rgba(255,212,108,0.65)');
      gradient.addColorStop(0.65, 'rgba(255,130,30,0.12)');
      gradient.addColorStop(1, 'rgba(255,130,30,0)');
    } else if (key === 'world-depth:white') {
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.25, 'rgba(255,255,255,0.6)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
    } else if (warm) {
      gradient.addColorStop(0, 'rgba(255,218,136,0.95)');
      gradient.addColorStop(0.2, 'rgba(255,164,52,0.65)');
      gradient.addColorStop(0.55, 'rgba(232,103,24,0.20)');
      gradient.addColorStop(1, 'rgba(232,103,24,0)');
    } else {
      gradient.addColorStop(0, 'rgba(29,24,19,0.94)');
      gradient.addColorStop(0.28, 'rgba(29,24,19,0.68)');
      gradient.addColorStop(0.68, 'rgba(29,24,19,0.20)');
      gradient.addColorStop(1, 'rgba(29,24,19,0)');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    texture.refresh();
    this.textures.add(key);
    return key;
  }
  private image(key: string, depth: number): Image {
    return this.scene.add
      .image(0, 0, key)
      .setDepth(depth)
      .setName('world-depth:effect');
  }
  private shadow(
    x: number,
    y: number,
    width: number,
    height: number,
    alpha: number,
  ): Image {
    return this.image(this.radial('world-depth:shadow', false), -9750)
      .setPosition(x, y)
      .setDisplaySize(width, height)
      .setAlpha(alpha);
  }
  /** Project the retained alpha silhouette onto the ground once, anchored to its foot pivot. */
  private projected(
    source: Image,
    frame = source.frame,
    cache = source.texture.key,
  ): Image {
    const key = 'world-depth:cast:' + cache;
    const size = 768,
      pivot = 256;
    if (!this.scene.textures.exists(key)) {
      const texture = this.scene.textures.createCanvas(key, size, 512)!;
      const ctx = texture.context;
      const silhouette = document.createElement('canvas');
      silhouette.width = frame.cutWidth;
      silhouette.height = frame.cutHeight;
      const ink = silhouette.getContext('2d')!;
      ink.drawImage(
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
      ink.globalCompositeOperation = 'source-in';
      ink.fillStyle = '#221d17';
      ink.fillRect(0, 0, silhouette.width, silhouette.height);
      ctx.save();
      ctx.filter = 'blur(4px)';
      ctx.translate(pivot, pivot);
      ctx.transform(
        1,
        0,
        -worldDepthConfig.shadowDirection.x,
        -worldDepthConfig.shadowDirection.y,
        0,
        0,
      );
      ctx.drawImage(
        silhouette,
        frame.x - frame.realWidth * source.originX,
        frame.y - frame.realHeight * source.originY,
      );
      ctx.restore();
      const edges = [
        ctx.getImageData(0, 0, size, 1),
        ctx.getImageData(0, 511, size, 1),
        ctx.getImageData(0, 0, 1, 512),
        ctx.getImageData(size - 1, 0, 1, 512),
      ];
      if (
        edges.some((edge) =>
          edge.data.some((value, i) => i % 4 === 3 && value > 0),
        )
      )
        this.clippedShadows.add(key);
      texture.refresh();
      this.textures.add(key);
    }
    return this.image(key, -9749)
      .setOrigin(pivot / size, 0.5)
      .setPosition(source.x, source.y)
      .setScale(source.scaleX, source.scaleY)
      .setAlpha(worldDepthConfig.castOpacity);
  }
  private buildProps(): void {
    this.terrain = createDepthTerrain(this.scene, (key) =>
      this.textures.add(key),
    );
    for (const [textureKey, prefix, shadows] of [
      ['renovated-hero_cai_bang_chuong', 'hero', this.heroShadows],
      ['renovated-creep_wild_dog', 'dog', this.dogShadows],
    ] as const) {
      for (const direction of ['down', 'left', 'right', 'up']) {
        const model = this.scene.add
          .image(0, 0, textureKey, 'idle_' + direction + '_0')
          .setVisible(false)
          .setOrigin(0.5, 0.875)
          .setScale(0.5);
        const shadow = this.projected(
          model,
          model.frame,
          prefix + ':' + direction,
        );
        shadows.set(direction, shadow.texture.key);
        shadow.destroy();
        model.destroy();
      }
    }
    for (const name of [
      'art01:statue_male',
      'art01:lantern:left',
      'art01:lantern:right',
    ]) {
      const source = this.scene.children.getByName(name) as Image | null;
      if (!source) continue;
      const statue = name === 'art01:statue_male';
      this.props.push(
        this.projected(source).setData('world-depth:source', source),
        this.shadow(
          source.x,
          source.y - 1,
          statue ? 102 : 27,
          statue ? 25 : 10,
          statue ? 0.27 : 0.3,
        ).setData('world-depth:source', source),
      );
      if (!statue) {
        const ground = this.image(this.radial('world-depth:light', true), -9740)
          .setPosition(source.x, source.y - 2)
          .setDisplaySize(100, 44)
          .setBlendMode(Phaser.BlendModes.ADD);
        const flame = this.emission.world(source);
        const glow = this.image(
          this.radial('world-depth:hot', true),
          source.depth + 0.01,
        )
          .setPosition(flame.x, flame.y)
          .setDisplaySize(30, 36)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.lanterns.push({ source, ground, glow });
      }
    }
    this.setEnabled(this.enabled);
  }
  private hideLight(light: FireLight): void {
    light.ground.setVisible(false);
    light.halo.setVisible(false);
    light.core.setVisible(false);
    delete light.source;
  }
  sync(
    state: LobbyState | undefined,
    zone: string,
    views: ReadonlyMap<string, Actor>,
  ): void {
    if (this.disposed) return;
    if (zone !== this.zone) {
      this.clear();
      this.zone = zone;
      if (zone === 'arena') this.buildProps();
    }
    this.radial('world-depth:shadow', false);
    const skip = new Set<string>();
    if (zone === 'arena') {
      state?.players.forEach((p, id) => {
        if (
          p.basicId === 'cai_bang_chuong' &&
          !views.get(id)?.sprite.getData('hero-motion-active')
        )
          skip.add(id);
      });
    }
    const profile = { ...depthProfile(zone) };
    if (zone === 'arena') {
      const selected = state?.defense.arenaId;
      if (selected === 'tuong_duong' || selected === 'tu_hien_trang') {
        profile.daylight = selected === 'tuong_duong' ? 0.025 : 0.035;
        profile.shade = 0.055;
        profile.ambient =
          selected === 'tuong_duong' ? [115, 105, 140] : [93, 136, 167];
        profile.sun =
          selected === 'tuong_duong' ? [255, 159, 83] : [178, 213, 245];
        profile.theme =
          selected === 'tuong_duong'
            ? 'firelit wartime night'
            : 'moonlit lotus water';
      }
    }
    this.activeProfile = profile;
    this.environment.sync(zone, profile);
    this.expandedShadows.sync(state, zone, views, profile, skip);
    if (zone === 'arena') {
      const active = new Set<string>();
      const renderShadow = (
        id: string,
        entity: { fx: number; fy: number; hp: number; zoneId: string },
        kind: 'hero' | 'dog',
      ) => {
        const actor = views.get(id);
        if (!actor || entity.zoneId !== zone) return;
        active.add(id);
        const shadows = kind === 'dog' ? this.dogShadows : this.heroShadows;
        let shadow = this.actors.get(id);
        if (!shadow) {
          shadow = {
            source: actor,
            kind,
            originalVisible: actor.shadow.visible,
            contact: this.shadow(
              0,
              0,
              kind === 'dog' ? 27 : 23,
              7,
              worldDepthConfig.contactOpacity,
            ),
            cast: this.image(shadows.get(facing(entity.fx, entity.fy))!, -9749)
              .setOrigin(1 / 3, 0.5)
              .setScale(0.5),
          };
          this.actors.set(id, shadow);
        }
        const visible = this.enabled && actor.sprite.visible && entity.hp > 0;
        actor.shadow.setVisible(this.enabled ? false : shadow.originalVisible);
        shadow.contact
          .setPosition(actor.sprite.x, actor.shadow.y)
          .setVisible(visible)
          .setAlpha(worldDepthConfig.contactOpacity * actor.sprite.alpha);
        shadow.cast
          .setTexture(shadows.get(facing(entity.fx, entity.fy))!)
          .setPosition(actor.sprite.x, actor.shadow.y + 3)
          .setVisible(visible)
          .setAlpha(worldDepthConfig.castOpacity * actor.sprite.alpha);
      };
      state?.players.forEach((player, id) => {
        if (
          player.basicId === 'cai_bang_chuong' &&
          !views.get(id)?.sprite.getData('hero-motion-active')
        )
          renderShadow(id, player, 'hero');
      });
      for (const [id, shadow] of this.actors)
        if (!active.has(id)) {
          if (shadow.source.shadow.scene && !this.enabled)
            shadow.source.shadow.setVisible(shadow.originalVisible);
          shadow.contact.destroy();
          shadow.cast.destroy();
          this.actors.delete(id);
        }
      for (const prop of this.props)
        prop.setVisible(
          this.enabled && !!prop.getData('world-depth:source')?.visible,
        );
      for (const lamp of this.lanterns) {
        lamp.ground.setVisible(this.enabled && lamp.source.visible);
        lamp.glow.setVisible(this.enabled && lamp.source.visible);
        const flicker =
          1 + 0.025 * Math.sin(this.scene.time.now * 0.004 + lamp.source.x);
        lamp.ground.setAlpha(worldDepthConfig.lanternIntensity * flicker);
        lamp.glow.setAlpha(0.53 * flicker);
      }
    }
    if (!this.enabled) {
      for (const light of this.lights) this.hideLight(light);
      return;
    }
    const camera = this.scene.cameras.main.worldView;
    const bodies = new Set([...views.values()].map((v) => v.sprite));
    const candidates: {
      source: Image;
      style: DepthLightStyle;
      distance: number;
    }[] = [];
    for (const object of this.scene.children.list) {
      const source = object as Image;
      if (
        source.name.startsWith('world-depth:') ||
        !source.texture ||
        !source.visible ||
        source.alpha <= 0.02 ||
        bodies.has(source as Phaser.GameObjects.Sprite)
      )
        continue;
      const style = depthLightStyle(this.scene, source);
      if (
        !style ||
        source.x < camera.x - 80 ||
        source.x > camera.right + 80 ||
        source.y < camera.y - 100 ||
        source.y > camera.bottom + 80
      )
        continue;
      candidates.push({
        source,
        style,
        distance: Phaser.Math.Distance.Squared(
          source.x,
          source.y,
          camera.centerX,
          camera.centerY,
        ),
      });
    }
    candidates.sort((a, b) => a.distance - b.distance);
    const selected = candidates.slice(0, worldDepthConfig.maxFireLights);
    for (let i = 0; i < selected.length; i++) {
      const { source, style } = selected[i]!;
      const ability = style.ability;
      let light = this.lights[i];
      if (!light) {
        light = {
          ground: this.image(
            this.radial('world-depth:light', true),
            -9735,
          ).setBlendMode(Phaser.BlendModes.ADD),
          halo: this.image(
            source.texture.key,
            source.depth - 0.01,
          ).setBlendMode(Phaser.BlendModes.ADD),
          core: this.image(
            this.radial('world-depth:hot', true),
            source.depth + 0.02,
          ).setBlendMode(Phaser.BlendModes.ADD),
          ability,
        };
        this.lights.push(light);
      }
      light.source = source;
      light.ability = ability;

      const radius = Phaser.Math.Clamp(
        Math.max(source.displayWidth, source.displayHeight) * 0.7,
        38,
        110,
      );
      const emission = this.emission.world(source, style.tone);
      if (!style.fire && emission.strength < 0.12) {
        this.hideLight(light);
        continue;
      }
      this.observed.add(ability);
      const strength = style.strength * (style.fire ? 1 : emission.strength);
      const radial = style.fire
        ? this.radial('world-depth:light', true)
        : this.radial('world-depth:white', true);
      light.ground
        .setTexture(radial)
        .setTint(style.fire ? 0xffffff : style.color)
        .setDepth(zone === 'arena' ? -9735 : depthProfile(zone).groundDepth + 3)
        .setPosition(emission.x, emission.y + 18)
        .setDisplaySize(radius * 1.5, radius * 0.65)
        .setAlpha(worldDepthConfig.fireIntensity * strength * source.alpha)
        .setVisible(true);
      light.halo
        .setTexture(source.texture.key, source.frame.name)
        .setOrigin(source.originX, source.originY)
        .setPosition(source.x, source.y)
        .setRotation(source.rotation)
        .setScale(source.scaleX * 1.055, source.scaleY * 1.055)
        .setFlip(source.flipX, source.flipY)
        .setDepth(source.depth - 0.01)
        .setTint(style.color)
        .setAlpha(0.19 * strength * source.alpha)
        .setVisible(true);
      const coreSize = Phaser.Math.Clamp(
        Math.min(
          source.frame.cutWidth * Math.abs(source.scaleX),
          source.frame.cutHeight * Math.abs(source.scaleY),
        ) * 0.5,
        10,
        26,
      );
      light.core
        .setTexture(style.fire ? this.radial('world-depth:hot', true) : radial)
        .setTint(style.fire ? 0xffffff : style.color)
        .setPosition(emission.x, emission.y)
        .setDisplaySize(coreSize, coreSize)
        .setDepth(source.depth + 0.02)
        .setAlpha(0.68 * strength * source.alpha)
        .setVisible(true);
    }
    for (let i = selected.length; i < this.lights.length; i++)
      this.hideLight(this.lights[i]!);
  }
  auditShadows() {
    return this.expandedShadows.auditEdges();
  }
  inspect() {
    return {
      enabled: this.enabled,
      profile: this.activeProfile,
      expandedShadows: this.expandedShadows.inspect(),
      environment: this.environment.inspect(),
      zone: this.zone,
      toggleKey: 'F8',
      actors: [...this.actors].map(([id, s]) => ({
        id,
        kind: s.kind,
        castTexture: s.cast.texture.key,
        x: s.contact.x,
        y: s.contact.y,
        visible: s.contact.visible,
        originalVisible: s.source.shadow.visible,
      })),
      props: this.props.map((p) => ({
        x: p.x,
        y: p.y,
        texture: p.texture.key,
        visible: p.visible,
      })),
      terrain: this.terrain.map((p) => ({
        texture: p.texture.key,
        visible: p.visible,
      })),
      heroShadowFacings: this.heroShadows.size,
      dogShadowFacings: this.dogShadows.size,
      groundJoins: this.scene.registry.get('world-depth:ground-joins'),
      clippedShadowTextures: [...this.clippedShadows],
      lanterns: this.lanterns.length,
      lanternGlows: this.lanterns.map((l) => ({ x: l.glow.x, y: l.glow.y })),
      pooledFireLights: this.lights.length,
      lights: this.lights
        .filter((l) => this.enabled && l.source)
        .map((l) => ({
          ability: l.ability,
          x: l.ground.x,
          y: l.ground.y,
          texture: l.source!.texture.key,
          frame: l.source!.frame.name,
          core: { x: l.core.x, y: l.core.y, visible: l.core.visible },
        })),
      observed: [...this.observed],
      textures: this.textures.size,
    };
  }
  clear(): void {
    this.expandedShadows.clear();
    this.environment.clear();
    for (const shadow of this.actors.values()) {
      if (shadow.source.shadow.scene)
        shadow.source.shadow.setVisible(shadow.originalVisible);
      shadow.contact.destroy();
      shadow.cast.destroy();
    }
    this.actors.clear();
    for (const image of this.props) image.destroy();
    this.props = [];
    for (const image of this.terrain) image.destroy();
    this.terrain = [];
    for (const lamp of this.lanterns) {
      lamp.ground.destroy();
      lamp.glow.destroy();
    }
    this.lanterns = [];
    for (const light of this.lights) {
      light.ground.destroy();
      light.halo.destroy();
      light.core.destroy();
    }
    this.lights = [];
    this.zone = '';
  }
  private destroy(): void {
    if (this.disposed) return;
    this.clear();
    for (const key of this.textures) this.scene.textures.remove(key);
    this.textures.clear();
    this.heroShadows.clear();
    this.dogShadows.clear();
    this.clippedShadows.clear();
    this.emission.clear();
    window.removeEventListener('keydown', this.key);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.scene.events.off(Phaser.Scenes.Events.DESTROY, this.destroy, this);
    this.disposed = true;
  }
}
