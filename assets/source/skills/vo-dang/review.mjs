/* global Phaser */
// Isolated data-driven consumer of the project's exported animation contract.
// No network/gameplay imports, room connection, simulation or authoritative timer.
const q = new URLSearchParams(location.search);
const manifest = await fetch(
  '/assets/exports/skills/vo-dang/production_manifest_v01.json',
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
const baseKey =
  skill === 'vo_dang_kiem' || (char && char.frameDimensions[0] === 96)
    ? 'hero_vo_dang_kiem'
    : 'hero_vo_dang';
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
let scene,
  clock = 0,
  paused = false;
window.__VO_DANG_SKILL_REVIEW__ = { ready: false, errors };
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
      window.__VO_DANG_SKILL_REVIEW__.ready = true;
      window.__VO_DANG_SKILL_REVIEW__.setTime = (t) => {
        paused = true;
        clock = t;
        render(t);
      };
      window.__VO_DANG_SKILL_REVIEW__.play = () => {
        paused = false;
        clock = 0;
      };
      window.__VO_DANG_SKILL_REVIEW__.snapshot = () => ({
        ready: true,
        phaser: Phaser.VERSION,
        skill,
        mode,
        direction,
        terrain,
        clock,
        errors,
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
  hero.setTexture(baseKey, 'idle_' + d + '_' + (Math.floor(t / 350) % 2));
  if (!char) {
    if (skill === 'vo_dang_quyen' || skill === 'vo_dang_kiem') {
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
    hit = document.querySelector('#hit').checked;
  for (const actor of actors) {
    const { x, y, d, ex, ey } = actor,
      [dx, dy] = vec[d];
    character(actor, t);
    const at = (stage, start, bx = x, by = y, scale = 1, rotation = 0) =>
      effect(stage, bx, by, t - start, d, scale, rotation);
    if (['thai_cuc_tran', 'bat_quai_kiem_tran'].includes(skill)) {
      at('activation', 100);
      if (t >= 360 && t < 1550) at('loop', 360);
      if (t >= 700 && t < 1450) effect('pulse', x, y, (t - 700) % 500, d);
      at('ending', 1550);
    } else if (skill === 'thai_cuc_than_cong') {
      at('activation', 100);
      if (t >= 360 && t < 1300) at('loop', 360);
      if (hit) at('absorption', 700);
      at('ending', 1300);
    } else if (skill === 'toa_sat_bac_do') {
      if (t >= 80 && t < 450) at('readiness', 80);
      if (hit) {
        at('received', 450);
        at('counter', 530);
        at('ending', 790);
      }
    } else if (
      skill === 'nhan_kiem_hop_nhat' ||
      (skill === 'vo_dang_kiem' && document.querySelector('#qi').checked)
    ) {
      const size = skill === 'vo_dang_kiem' ? 0.5 : 1;
      at('release', 160, x, y, size);
      if (t >= 200 && t < 1050) {
        const travel = (t - 200) * 0.18;
        effect(
          'travel',
          x + dx * (24 + travel),
          y + dy * (24 + travel) - 22,
          t - 200,
          d,
          size,
        );
      }
      if (hit) {
        at('impact', 620, ex, ey - 22, size);
        if (skill === 'nhan_kiem_hop_nhat')
          at('impact', 900, ex + dx * 50, ey + dy * 50 - 22, size);
      }
      at('ending', 1050, x + dx * 180, y + dy * 180 - 22, size);
    } else if (skill === 'van_kiem_quy_tong') {
      at('preparation', 0);
      at('release', 180);
      const center = Math.atan2(dy, dx);
      for (const [i, angle] of [-0.4, 0, 0.4].entries()) {
        const start = 210 + i * 90,
          age = t - start;
        if (age >= 0 && age < 750) {
          const distance = 22 + age * 0.18;
          effect(
            'travel',
            x + Math.cos(center + angle) * distance,
            y - 22 + Math.sin(center + angle) * distance,
            age,
            d,
            1,
            angle,
          );
        }
        if (hit && t >= start + 600 && t < start + 860)
          effect(
            'impact',
            x + Math.cos(center + angle) * 130,
            y - 22 + Math.sin(center + angle) * 130,
            t - start - 600,
            d,
          );
      }
    } else if (skill === 'that_tinh_kiem') {
      at('slash_a', 100);
      at('slash_b', 230);
      if (hit) at('impact', 300, ex, ey - 22);
      at('ending', 490);
    } else if (skill === 'huyen_am_chuong') {
      at('release', 120);
      if (t >= 160 && t < 530)
        effect(
          'travel',
          x + dx * (20 + (t - 160) * 0.08),
          y - 22 + dy * (20 + (t - 160) * 0.08),
          t - 160,
          d,
        );
      if (hit) {
        at('impact', 420, ex, ey - 22);
        if (t >= 500 && t < 1300) at('slow', 500, ex, ey);
      }
    } else if (skill === 'luong_nghi_thu' || skill === 'duong_khi_kich') {
      at('release', 120);
      if (hit) {
        at('impact', 260, ex, ey - 22);
        if (skill === 'luong_nghi_thu' && t >= 400 && t < 1200)
          at('weakening', 400, ex, ey);
        if (skill === 'duong_khi_kich') at('mana_return', 420);
      }
      at(
        'ending',
        1300,
        skill === 'duong_khi_kich' ? ex : x,
        skill === 'duong_khi_kich' ? ey - 22 : y,
      );
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
