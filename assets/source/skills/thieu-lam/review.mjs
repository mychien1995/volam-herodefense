/* global Phaser */
// Isolated data-driven consumer of the project's exported animation contract.
// No network/gameplay imports, room connection, simulation or authoritative timer.
const q = new URLSearchParams(location.search);
const manifest = await fetch(
  '/assets/exports/skills/thieu-lam/production_manifest_v01.json',
).then((r) => r.json());
const entry =
  manifest.entries.find((e) => e.id === q.get('skill')) ?? manifest.entries[0];
const skill = entry.id,
  mode = q.get('mode') ?? 'combined',
  direction = q.get('direction') ?? 'right',
  terrain = q.get('terrain') ?? 'arena';
const dirs = ['down', 'left', 'right', 'up'],
  vec = { right: [1, 0], down: [0, 1], left: [-1, 0], up: [0, -1] };
const char = manifest.assets.find((a) => a.id === entry.characterAsset),
  vfx = manifest.assets.find((a) => a.id === entry.vfxAsset);
const selected = manifest.assets.filter(
  (a) => a.id === entry.characterAsset || a.id === entry.vfxAsset,
);
const baseKey = entry.style === 'dao' ? 'hero_thieu_lam_dao' : 'hero_thieu_lam';
const baseAtlas = await fetch(
  '/assets/exports/characters/' + baseKey + '.json',
).then((r) => r.json());
for (const item of manifest.entries) {
  const opt = document.createElement('option');
  opt.value = item.id;
  opt.textContent = item.nameVi;
  document.querySelector('#skill').append(opt);
}
for (const [id, value] of Object.entries({ skill, mode, direction, terrain })) {
  const el = document.querySelector('#' + id);
  el.value = value;
  el.onchange = () => {
    q.set(id, el.value);
    location.search = q.toString();
  };
}
document.querySelector('#selected-icon').src = '/' + entry.icon;
for (const item of manifest.entries) {
  const article = document.createElement('article');
  article.dataset.skill = item.id;
  const label = document.createElement('span');
  label.textContent = item.nameVi;
  article.append(label);
  for (const size of [64, 44, 32]) {
    const im = document.createElement('img');
    im.src = '/' + item.icon;
    im.width = size;
    im.height = size;
    im.alt = item.nameVi + ' ' + size + 'px';
    article.append(im);
  }
  document.querySelector('#icons').append(article);
}
if (mode === 'icons') document.querySelector('#icons').style.display = 'grid';
const errors = [],
  tracked = [],
  actors = [],
  ephemeral = [];
const frameEvents = {};
let scene,
  clock = 0,
  paused = false;
window.__THIEU_LAM_SKILL_REVIEW__ = { ready: false, errors };
const game = new Phaser.Game({
  parent: 'viewport',
  type: Phaser.AUTO,
  width: 640,
  height: 360,
  zoom: 2,
  pixelArt: true,
  roundPixels: true,
  audio: { noAudio: true },
  backgroundColor: '#c5b99e',
  scene: {
    preload() {
      for (const a of selected)
        this.load.atlas(a.id, '/' + a.sheet, '/' + a.atlas);
      this.load.atlas(
        baseKey,
        '/assets/exports/characters/' + baseKey + '.png',
        '/assets/exports/characters/' + baseKey + '.json',
      );
      this.load.image('arena', '/assets/exports/arena_v2/ground.png');
      this.load.atlas(
        'enemy',
        '/sprites/creeps/arena/bandit-grunt/spritesheet.png',
        '/sprites/creeps/arena/bandit-grunt/atlas.json',
      );
      this.load.on('loaderror', (f) => errors.push(f.url));
    },
    create() {
      scene = this;
      if (terrain === 'arena') this.add.image(-480, -405, 'arena').setOrigin(0);
      else
        this.cameras.main.setBackgroundColor(
          terrain === 'dark' ? '#23362e' : '#c5b99e',
        );
      for (const a of selected) {
        this.textures.get(a.id).setFilter(Phaser.Textures.FilterMode.NEAREST);
        for (const anim of a.animations)
          this.anims.create({
            key: a.id + ':' + anim.name,
            frames: anim.frames.map((frame) => ({ key: a.id, frame })),
            frameRate: anim.frameRate,
            repeat: anim.repeat,
          });
      }
      this.textures.get(baseKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
      for (const tag of baseAtlas.meta.frameTags) {
        const names = Object.keys(baseAtlas.frames).slice(tag.from, tag.to + 1);
        this.anims.create({
          key: baseKey + ':' + tag.name,
          frames: names.map((frame) => ({ key: baseKey, frame })),
          frameRate: 1000 / baseAtlas.frames[names[0]].duration,
          repeat: tag.name.startsWith('basic_attack') ? 0 : -1,
        });
      }
      const gallery = (a, anims) => {
        const cols = 4,
          rows = Math.ceil(anims.length / cols);
        anims.forEach((anim, i) => {
          const x = 80 + (i % cols) * 160,
            y = 105 + Math.floor(i / cols) * (210 / rows);
          const sprite = this.add
            .sprite(x, y, a.id, anim.frames[0])
            .setOrigin(...anim.origin)
            .play({ key: a.id + ':' + anim.name, repeat: -1 });
          tracked.push({ sprite, a, anim, anchor: [x, y] });
          const record = () => {
            const key = a.id + ':' + anim.name;
            (frameEvents[key] ??= []).includes(sprite.frame.name) ||
              frameEvents[key].push(sprite.frame.name);
          };
          sprite.on('animationupdate', record);
          sprite.on('animationrepeat', record);
          record();
          this.add
            .text(x - 70, y + 25, anim.name, {
              fontFamily: 'Arial',
              fontSize: '8px',
              color: terrain === 'light' ? '#242c31' : '#edf2e8',
            })
            .setDepth(10000);
        });
      };
      if (mode === 'character' && char) gallery(char, char.animations);
      else if (mode === 'vfx' && vfx) gallery(vfx, vfx.animations);
      else if (mode !== 'icons') {
        const layouts =
          mode === 'six'
            ? [
                [105, 150, 'right'],
                [535, 150, 'left'],
                [190, 290, 'up'],
                [450, 290, 'up'],
                [255, 115, 'down'],
                [385, 115, 'down'],
              ]
            : [
                [
                  direction === 'left'
                    ? 455
                    : direction === 'up'
                      ? 320
                      : direction === 'down'
                        ? 320
                        : 180,
                  direction === 'up' ? 280 : direction === 'down' ? 112 : 230,
                  direction,
                ],
              ];
        for (const [x, y, d] of layouts) {
          const hero = this.add
            .sprite(x, y, baseKey, 'idle_' + d + '_0')
            .setOrigin(0.5, 0.8)
            .setDepth(y);
          const [dx, dy] = vec[d];
          const distance = [
            'nhu_lai_thien_diep',
            'nhan_kiem_hop_nhat',
            'van_kiem_quy_tong',
            'vo_dang_kiem',
          ].includes(skill)
            ? 100
            : 68;
          const enemy = this.add
            .sprite(
              x + dx * distance,
              y + dy * distance,
              'enemy',
              'idle_down_0',
            )
            .setOrigin(0.5, 0.8)
            .setDepth(y + dy * distance);
          actors.push({
            hero,
            enemy,
            x,
            y,
            d,
            ex: x + dx * distance,
            ey: y + dy * distance,
          });
        }
      }
      window.__THIEU_LAM_SKILL_REVIEW__.ready = true;
      window.__THIEU_LAM_SKILL_REVIEW__.setTime = (t) => {
        paused = true;
        clock = t;
        render(t);
      };
      window.__THIEU_LAM_SKILL_REVIEW__.play = () => {
        paused = false;
        clock = 0;
      };
      window.__THIEU_LAM_SKILL_REVIEW__.snapshot = () => ({
        ready: true,
        phaser: Phaser.VERSION,
        skill,
        mode,
        direction,
        terrain,
        clock,
        errors,
        frameEvents,
        selectedIcon: entry.icon,
        logicalCanvas: [640, 360],
        displayCanvas: [1280, 720],
        zoom: 1,
        sprites: tracked.map((t) => ({
          asset: t.a.id,
          animation: t.anim.name,
          frame: t.sprite.frame.name,
          total: t.anim.frameCount,
          origin: [t.sprite.originX, t.sprite.originY],
          anchor: [t.sprite.x, t.sprite.y],
          expectedAnchor: t.anchor,
        })),
        actors: actors.map((a) => ({
          x: a.hero.x,
          y: a.hero.y,
          expected: [a.x, a.y],
          origin: [a.hero.originX, a.hero.originY],
          texture: a.hero.texture.key,
          frame: a.hero.frame.name,
        })),
        effects: ephemeral.map((e) => ({
          stage: e.stage,
          x: e.sprite.x,
          y: e.sprite.y,
          rotation: e.sprite.rotation,
          frame: e.sprite.frame.name,
          origin: [e.sprite.originX, e.sprite.originY],
        })),
        liveEffects: ephemeral.length,
        hit: document.querySelector('#hit').checked,
      });
      document.querySelector('#replay').onclick = () => {
        clock = 0;
        paused = false;
      };
      document.querySelector('#pause').onclick = () => {
        paused = !paused;
      };
      render(0);
    },
    update(t, delta) {
      if (!paused) {
        clock += delta;
        render(clock);
      }
    },
  },
});
function effect(stage, baseX, baseY, age, d, scale = 1, rotation = 0) {
  if (!vfx || age < 0) return;
  const anim = vfx.animations.find(
    (a) => a.stage === stage && (a.direction === d || a.direction === 'none'),
  );
  if (!anim) return;
  let index = Math.floor(age / anim.durationMsPerFrame);
  if (!anim.loop && index >= anim.frameCount) return;
  index %= anim.frameCount;
  const offset = anim.effectPlacementOffset;
  const sprite = scene.add
    .sprite(
      Math.round(baseX + offset[0]),
      Math.round(baseY + offset[1]),
      vfx.id,
      anim.frames[index],
    )
    .setOrigin(...anim.origin)
    .setScale(scale)
    .setRotation(rotation)
    .setDepth(anim.placement === 'ground' ? baseY - 10 : baseY + 3);
  ephemeral.push({ sprite, stage });
}
function character(actor, t) {
  const { hero, d } = actor;
  hero
    .setTexture(baseKey, 'idle_' + d + '_' + (Math.floor(t / 350) % 2))
    .setOrigin(0.5, 0.8);
  if (mode === 'basic') {
    let age = t;
    const frames = Object.keys(baseAtlas.frames).filter((name) =>
      name.startsWith('basic_attack_' + d + '_'),
    );
    for (const name of frames) {
      const duration = baseAtlas.frames[name].duration;
      if (age < duration) {
        hero.setFrame(name);
        return;
      }
      age -= duration;
    }
    return;
  }
  if (!char) {
    if (false) {
      if (t < 160) hero.setFrame('walk_' + d + '_' + (Math.floor(t / 40) % 4));
      else if (t < 460)
        hero.setFrame(
          'basic_attack_' + d + '_' + Math.min(3, Math.floor((t - 160) / 75)),
        );
    }
    return;
  }
  let anim = char.animations.find((a) => a.name === 'cast_' + d),
    age = t;
  if (skill === 'toa_sat_bac_do') {
    if (t < 450) {
      anim = char.animations.find((a) => a.name === 'ready_' + d);
      age = t;
    } else if (document.querySelector('#hit').checked && t < 690) {
      anim = char.animations.find((a) => a.name === 'counter_' + d);
      age = t - 450;
    } else return;
  } else if (t >= anim.frameCount * anim.durationMsPerFrame) return;
  const index = anim.loop
    ? Math.floor(age / anim.durationMsPerFrame) % anim.frameCount
    : Math.min(anim.frameCount - 1, Math.floor(age / anim.durationMsPerFrame));
  hero.setTexture(char.id, anim.frames[index]).setOrigin(...anim.origin);
}
function render(time) {
  if (!scene || !actors.length) return;
  for (const e of ephemeral) e.sprite.destroy();
  ephemeral.length = 0;
  const t = time % 2400,
    hit = document.querySelector('#hit').checked,
    empowered = document.querySelector('#empowered').checked;
  for (const actor of actors) {
    const { x, y, d, ex, ey } = actor,
      [dx, dy] = vec[d];
    character(actor, t);
    if (!vfx || mode === 'basic') continue;
    const stages = [...new Set(vfx.animations.map((a) => a.stage))];
    const field = ['kim_quang_ho_tran', 'bat_dong_minh_vuong'].includes(skill);
    for (const stage of stages) {
      if (stage.startsWith('empowered_') && !empowered) continue;
      if (empowered && stages.includes('empowered_' + stage)) continue;
      const anim = vfx.animations.find(
        (a) =>
          a.stage === stage && (a.direction === d || a.direction === 'none'),
      );
      let start = 160,
        bx = x,
        by = y,
        age;
      if (['preparation', 'windup'].includes(stage)) start = 0;
      if (
        ['release', 'slash', 'sweep', 'spin'].includes(
          stage.replace('empowered_', ''),
        )
      )
        start = 180;
      if (['impact', 'empowered_impact'].includes(stage)) {
        if (!hit) continue;
        start = skill === 'nhu_lai_thien_diep' ? 540 : 230;
        bx = ex;
        by = ey - 22;
      }
      if (['armor_break', 'slow'].includes(stage)) {
        if (!hit) continue;
        start = 350;
        bx = ex;
        by = ey;
      }
      if (stage === 'activation') start = 80;
      if (stage === 'loop') {
        start = 360;
        if (t >= 1300) continue;
      }
      if (['pulse', 'healing_pulse'].includes(stage)) start = 700;
      if (stage === 'guard') start = 330;
      if (stage === 'hit_response') {
        if (!hit) continue;
        start = 650;
      }
      if (stage === 'ground_impact') start = 220;
      if (stage === 'aftereffect') start = 400;
      if (stage === 'ally_defense') {
        start = 650;
        bx = x + dx * 45;
        by = y + dy * 45;
      }
      if (stage === 'ending')
        start =
          field || skill === 'kim_cang_bat_hoai' || skill === 'nhu_lai_niet_ban'
            ? 1400
            : 520;
      if (stage === 'travel') {
        start = 240;
        if (t >= 1000) continue;
        const initial = skill === 'nhu_lai_thien_diep' ? (dy ? 72 : 46) : 28;
        const speed =
          skill === 'nhu_lai_thien_diep' ? (100 - initial) / 300 : 0.12;
        const distance = initial + Math.max(0, t - start) * speed;
        bx = x + dx * distance;
        by = y - 22 + dy * distance;
      }
      age = t - start;
      effect(stage, bx, by, age, d);
    }
  }
}
window.addEventListener('keydown', (event) => {
  if (/INPUT|SELECT/.test(document.activeElement?.tagName)) return;
  if (['a', 'q', 'w', 'e', 'r'].includes(event.key.toLowerCase())) {
    clock = 0;
    paused = false;
    event.preventDefault();
  }
});
window.addEventListener('beforeunload', () => game.destroy(true));
