import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  BacCaiEncounter,
  VuongEncounter,
  initializeNamDe,
  spawnNamDeIfReady,
  beginNamDeCast,
  namDeAbilities,
  bacCaiAbilities,
} from '@volam/game-core';
import {
  bacCaiDefinition,
  vuongDefinition,
  namDeDefinition,
} from '@volam/game-data';
import { waitForQa } from './qa-wait.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function verifyRenovationBosses({
  room,
  pages,
  out,
  full,
  allowM3d = false,
}) {
  const [page, peer] = pages,
    sim = room.simulation,
    report = {
      fixture:
        'Server-side encounter ability selection/prerequisites; real fixed-tick encounter execution, original release geometry and replicated Phaser renderers. This is coverage, not a natural progression/defeat run.',
      cases: [],
      forms: [],
    };
  const seen = new Set(),
    present = (p) => p.evaluate(() => window.__VOLAM__.presentation()),
    snapshot = (p) => p.evaluate(() => window.__VOLAM__.snapshot());
  const wait = (fn, label) =>
    waitForQa(fn, label, {
      timeout: 18000,
      diagnostics: async () => ({ view: await present(page) }),
    });
  let w = room.world,
    c = sim.arena.config;
  const exitAll = () => {
    for (const id of sim.membership.keys()) {
      const z = sim.zoneOf(id),
        h = sim.hero(id);
      if (z.id !== 'arena') {
        h.hp = h.maxHp;
        Object.assign(h, z.dungeon.exit);
        assert.equal(sim.exit(id), undefined);
      }
    }
  };
  const arrange = (actor, fx = 1, fy = 0, distance = 100) => {
    actor.x = c.width / 2;
    actor.y = c.height * 0.6;
    actor.statuses = [];
    actor.hp = actor.maxHp;
    actor.fx = fx;
    actor.fy = fy;
    for (const [i, h] of [...w.heroes.values()].entries())
      Object.assign(h, {
        x: actor.x + fx * distance - fy * i * 45,
        y: actor.y + fy * distance + fx * i * 45,
        fx: -fx,
        fy: -fy,
        moveX: 0,
        moveY: 0,
        hp: 100000,
        maxHp: 100000,
        statuses: [],
        pose: 'idle',
        actionUntil: 0,
        hurtUntil: 0,
        skillIds: ['', '', '', ''],
      });
  };
  const sample = async ({
    group,
    skill,
    actor,
    form,
    ms = 1800,
    primary = true,
  }) => {
    const frames = new Set(),
      fx = new Map(),
      poses = new Set(),
      start = performance.now();
    let active = 0,
      captured = false;
    const canonicalSkill = skill.replace(/-(left|right|up|down)$/, '');
    const restored =
      allowM3d &&
      (['chu', 'kim'].includes(group) ||
        (group === 'ly-mac-sau' && canonicalSkill !== 'bang_phach_ngan_cham') ||
        (group === 'hong-liet' &&
          ['hong_liet_a2', 'liet_diem_phong_toa'].includes(canonicalSkill)));
    if (
      process.env.VOLAM_V3_BOSS_GROUP &&
      !process.env.VOLAM_V3_BOSS_GROUP.split(',').includes(group)
    )
      return;
    while (performance.now() - start < ms) {
      const v = await present(page);
      for (const b of v.renovation.bodies.filter((b) => b.visible)) {
        if (
          restored &&
          b.id === form &&
          !b.locomotion &&
          !['hurt', 'death'].includes(b.pose) &&
          performance.now() - start > 200
        ) {
          assert(
            !b.texture.startsWith('renovated-action-'),
            'expected M3D ' + group + '/' + skill + ' ' + JSON.stringify(b),
          );
          assert(
            !b.source.includes('/renovation-v3/actors/'),
            'old cast source ' + group,
          );
          frames.add(b.id + ':' + b.texture + ':' + b.frame);
          active++;
          seen.add(b.id);
        }
        if (b.action) {
          assert(
            b.source.includes('/renovation-v3/') ||
              b.source.includes('/renovation-v2/'),
            group + ' old ' + b.id,
          );
          frames.add(b.id + ':' + b.frame);
          seen.add(b.id);
        }
        if (b.id === form) {
          poses.add(b.pose);
          if (b.action) {
            assert.equal(b.effectiveDensity, 2);
            active++;
            assert.deepEqual(
              b.origin,
              [0.5, 0.8],
              group + ' fixed native foot pivot',
            );
          }
        }
      }
      for (const e of v.renovation.skillEffects)
        fx.set(e.texture + ':' + e.frame, e);
      if (
        primary &&
        !captured &&
        performance.now() - start > Math.min(600, ms / 2)
      ) {
        await page.screenshot({
          path: resolve(out, 'boss-' + group + '-' + skill + '.png'),
        });
        captured = true;
      }
      for (const h of w.heroes.values())
        if (h.hp > 0) h.hp = Math.max(h.hp, 10000); // Durable fixture subjects; damage/events are still produced by the encounter.
      await sleep(40);
    }
    assert(
      active > 0,
      group +
        '/' +
        skill +
        (restored ? ' restored M3D body ' : ' new cast body ') +
        form +
        '; seen ' +
        [...poses],
    );
    const a = await snapshot(page),
      b = await snapshot(peer);
    const zone = sim.zoneOf([...sim.membership.keys()][0]);
    const projected = (s) => {
      if (group === 'bac-cai') {
        const v = JSON.parse(s.state.bacCai.arena.snapshot);
        return v.boss ?? v.forms[0];
      }
      return group === 'vuong'
        ? JSON.parse(s.state.vuong.arena.snapshot)
        : s.state.creeps[
            zone.access === 'arena' ? actor.id : zone.id + ':' + actor.id
          ];
    };
    const liveA = projected(a),
      liveB = projected(b);
    assert(liveA && liveB, group + ' actor peer');
    assert(Math.abs(liveA.x - liveB.x) < 90, group + ' peer position');
    report.cases.push({
      group,
      skill,
      form,
      observedMs: ms,
      fullLifetime: false,
      restoredM3d: restored,
      frames: [...frames],
      poses: [...poses],
      fx: [...fx.values()],
      peer: true,
    });
    writeFileSync(
      resolve(out, 'boss-matrix-progress.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log('[v3 boss] ' + group + '/' + skill + ' PASS');
  };
  const cleanArena = () => {
    exitAll();
    w = room.world;
    c = sim.arena.config;
    w.creeps.clear();
    w.projectiles.clear();
    w.areas = [];
    w.shots = [];
    w.actions = [];
    w.combos = [];
    w.namDe = undefined;
    w.vuong = undefined;
    w.bacCai = undefined;
    sim.dongTa.phase = 'waiting';
    sim.tayDoc.phase = 'waiting';
    sim.mainBosses.encounter = undefined;
    sim.waveArena = undefined;
    sim.lockWaveArena(false);
    sim.invasion.wave = 0;
    sim.invasion.nextWaveTick = w.tick + 100000;
  };
  const facings = full
    ? [
        ['down', 0, 1],
        ['left', -1, 0],
        ['up', 0, -1],
      ]
    : [];
  cleanArena();
  const dong = sim.dongTa;
  dong.phase = 'fighting';
  dong.summoned = true;
  for (const [i, id] of ['dong_ta', 'mai_sieu_phong', 'hoang_dung'].entries())
    dong.spawn(w, c, id, { x: 700 + i * 140, y: 600 });
  for (const skill of Object.keys(dong.definition.abilities)) {
    const id = /bach_cot|ma_anh|am_phong|doc_cot/.test(skill)
        ? 'mai_sieu_phong'
        : /thanh_am|linh_xa/.test(skill)
          ? 'hoang_dung'
          : 'dong_ta',
      actor = w.creeps.get(id);
    dong.casts = [];
    dong.effects = [];
    for (const e of w.creeps.values()) e.cooldown = w.tick + 100000;
    arrange(actor);
    assert(dong.beginCast(w, c, id, skill, [...w.heroes.keys()][0]));
    const d = dong.definition.abilities[skill];
    await sample({
      group: 'dong-ta',
      skill,
      actor,
      form: id,
      ms: Math.min(
        6000,
        ((d.windup + Math.min(d.duration, 75)) * 1000) / c.tickRate + 350,
      ),
    });
  }
  for (const id of ['dong_ta', 'mai_sieu_phong', 'hoang_dung'])
    for (const [direction, fx, fy] of facings) {
      dong.casts = [];
      dong.effects = [];
      const actor = w.creeps.get(id),
        skill =
          id === 'dong_ta'
            ? 'dan_chi_than_cong'
            : id === 'mai_sieu_phong'
              ? 'bach_cot_trao'
              : 'thanh_am_ho_tro';
      arrange(actor, fx, fy);
      assert(dong.beginCast(w, c, id, skill, [...w.heroes.keys()][0]));
      await sample({
        group: id,
        skill: skill + '-' + direction,
        actor,
        form: id,
        ms: 1300,
        primary: false,
      });
    }
  cleanArena();
  const tay = sim.tayDoc;
  assert(tay.spawn(w, c));
  for (const skill of Object.keys(tay.definition.attacks)) {
    tay.cast = undefined;
    tay.pools.clear();
    tay.pillars.clear();
    tay.projectiles.clear();
    tay.nextActionAt = w.tick + 100000;
    const p2 = [
      'doc_chuong',
      'cap_mo_chan_kich',
      'ngu_doc_than_chuong',
      'van_doc_bao_phat',
    ].includes(skill);
    tay.phase = p2 ? 'phase2' : 'phase1';
    const actor = w.creeps.get(tay.bossId);
    arrange(actor);
    assert(tay.begin(w, c, skill, [...w.heroes.values()][0]));
    await sample({
      group: 'tay-doc',
      skill,
      actor,
      form: p2 ? 'tay_doc_cap_mo' : 'tay_doc',
      ms: Math.min(
        6000,
        ((tay.cast.endsAt - w.tick) * 1000) / c.tickRate + 250,
      ),
    });
  }
  for (const p2 of [false, true])
    for (const [direction, fx, fy] of facings) {
      tay.cast = undefined;
      tay.nextActionAt = w.tick + 100000;
      tay.phase = p2 ? 'phase2' : 'phase1';
      const actor = w.creeps.get(tay.bossId);
      arrange(actor, fx, fy);
      const skill = p2 ? 'doc_chuong' : 'tay_doc_staff';
      assert(tay.begin(w, c, skill, [...w.heroes.values()][0]));
      await sample({
        group: 'tay-doc',
        skill: skill + '-' + direction,
        actor,
        form: p2 ? 'tay_doc_cap_mo' : 'tay_doc',
        ms: 1400,
        primary: false,
      });
    }
  cleanArena();
  initializeNamDe(w, c, namDeDefinition);
  w.namDe.phase = 'rest';
  w.namDe.spawnAt = 0;
  spawnNamDeIfReady(w, c, w.tick);
  w.namDe.phase = 'combat';
  for (const skill of namDeAbilities) {
    const s = w.namDe,
      actor = w.creeps.get('boss_nam_de');
    s.cast = undefined;
    s.smallCast = undefined;
    s.effects.clear();
    s.nextActionAt = s.nextSmallAt = w.tick + 100000;
    arrange(actor);
    assert(beginNamDeCast(w, c, skill, [...w.heroes.keys()][0]));
    await sample({
      group: 'nam-de',
      skill,
      actor,
      form: 'nam_de',
      ms: Math.min(
        6000,
        Math.max(
          1500,
          (((s.cast ?? s.smallCast).until - w.tick) * 1000) / c.tickRate + 200,
        ),
      ),
    });
  }
  for (const [direction, fx, fy] of facings) {
    const s = w.namDe,
      actor = w.creeps.get('boss_nam_de');
    s.cast = s.smallCast = undefined;
    s.effects.clear();
    s.nextActionAt = s.nextSmallAt = w.tick + 100000;
    arrange(actor, fx, fy);
    assert(beginNamDeCast(w, c, 'nhat_duong_chi', [...w.heroes.keys()][0]));
    await sample({
      group: 'nam-de',
      skill: 'nhat_duong_chi-' + direction,
      actor,
      form: 'nam_de',
      ms: 1600,
      primary: false,
    });
  }
  cleanArena();
  const bac = new BacCaiEncounter(bacCaiDefinition);
  bac.initialize(w, c);
  bac.phase = 'combat';
  sim.mainBosses.encounter = bac;
  for (const skill of bacCaiAbilities) {
    bac.cast = undefined;
    bac.forms = [];
    bac.effects.clear();
    bac.nextAction = w.tick + 100000;
    bac.phase = 'combat';
    const actor = w.creeps.get(bac.bossId);
    arrange(actor);
    assert(bac.begin(w, c, skill, [...w.heroes.values()][0]));
    await sample({
      group: 'bac-cai',
      skill,
      actor,
      form: 'bac_cai',
      ms: Math.min(
        6000,
        Math.max(1800, ((bac.cast.end - w.tick) * 1000) / c.tickRate + 300),
      ),
    });
  }
  for (const [direction, fx, fy] of facings) {
    bac.cast = undefined;
    bac.forms = [];
    bac.effects.clear();
    bac.nextAction = w.tick + 100000;
    const actor = w.creeps.get(bac.bossId);
    arrange(actor, fx, fy);
    assert(bac.begin(w, c, 'palms', [...w.heroes.values()][0]));
    await sample({
      group: 'bac-cai',
      skill: 'palms-' + direction,
      actor,
      form: 'bac_cai',
      ms: 1600,
      primary: false,
    });
  }
  cleanArena();
  const vuong = new VuongEncounter(vuongDefinition);
  vuong.initialize(w, c);
  vuong.releasedAt = w.tick - 100;
  for (const skill of [
    'thrust',
    'slash',
    'crescent',
    'tam',
    'counter',
    'elements',
    'stars',
    'pulse',
    'swords',
    'notes',
  ]) {
    vuong.action = undefined;
    vuong.nextAction = w.tick + 100000;
    vuong.phase = ['stars', 'pulse', 'swords', 'notes'].includes(skill) ? 2 : 1;
    const actor = w.creeps.get('vuong_trung_duong');
    arrange(actor);
    vuong.start(w, c, actor, skill, [...w.heroes.values()][0], [
      ...w.heroes.values(),
    ]);
    await sample({
      group: 'vuong',
      skill,
      actor,
      form: 'vuong_trung_duong_p' + vuong.phase,
      ms: skill === 'elements' ? 5100 : skill === 'swords' ? 3200 : 2000,
    });
  }
  for (const phase of [1, 2])
    for (const [direction, fx, fy] of facings) {
      vuong.action = undefined;
      vuong.nextAction = w.tick + 100000;
      vuong.phase = phase;
      const actor = w.creeps.get('vuong_trung_duong');
      arrange(actor, fx, fy);
      const skill = phase === 1 ? 'tam' : 'pulse';
      vuong.start(w, c, actor, skill, [...w.heroes.values()][0], [
        ...w.heroes.values(),
      ]);
      await sample({
        group: 'vuong',
        skill: skill + '-' + direction,
        actor,
        form: 'vuong_trung_duong_p' + phase,
        ms: 1600,
        primary: false,
      });
    }
  cleanArena();
  for (const destination of [
    'chu_ba_thong',
    'hong_liet',
    'kim_luan',
    'co_mo',
  ]) {
    exitAll();
    for (const id of sim.membership.keys()) {
      sim.hero(id).hp = sim.hero(id).maxHp;
      assert.equal(sim.enter(id, 'shared', destination), undefined);
    }
    const zone = sim.zoneOf([...sim.membership.keys()][0]);
    w = zone.world;
    c = zone.config;
    await wait(
      async () => (await present(page)).zoneId === zone.id,
      'boss map ' + destination,
    );
    if (allowM3d && destination === 'co_mo') {
      const statues = (await present(page)).renovation.environment.filter((o) =>
        /^co_mo:(male|female)_founder_statue:r3$/.test(o.name),
      );
      assert.equal(statues.length, 2, 'restored original founder pair');
      report.founderPair = statues;
      const hero = [...w.heroes.values()][0];
      hero.x = statues.reduce((n, s) => n + s.x, 0) / 2;
      hero.y = statues.reduce((n, s) => n + s.y, 0) / 2 + 80;
      await sleep(650);
      await page.screenshot({ path: resolve(out, 'co-mo-founder-pair.png') });
    }
    if (destination === 'chu_ba_thong') {
      for (const [index, phase] of w.chu.definition.phases.entries()) {
        if (phase.id === 'idle') continue;
        const actor =
          w.creeps.get('boss_chu_ba_thong') ??
          [...w.creeps.values()].find((a) => a.archetypeId === 'chu_ba_thong');
        arrange(actor);
        w.chu.phaseIndex = index - 1;
        w.chu.until = w.tick;
        await sample({
          group: 'chu',
          skill: phase.id,
          actor,
          form: 'chu_ba_thong',
          ms:
            phase.id === 'drink'
              ? 7800
              : Math.min(4500, (phase.ticks * 1000) / c.tickRate + 100),
        });
      }
      for (const [direction, fx, fy] of facings) {
        const actor = w.creeps.get('chu_ba_thong');
        arrange(actor, fx, fy);
        w.chu.phaseIndex =
          w.chu.definition.phases.findIndex((p) => p.id === 'palm') - 1;
        w.chu.until = w.tick;
        await sample({
          group: 'chu',
          skill: 'palm-' + direction,
          actor,
          form: 'chu_ba_thong',
          ms: 1600,
          primary: false,
        });
      }
    } else if (destination === 'hong_liet') {
      const e = zone.encounter;
      for (const skill of Object.keys(e.definition.abilities)) {
        e.cast = undefined;
        e.effects.clear();
        e.nextActionAt = w.tick + 100000;
        const actor = w.creeps.get(e.bossId);
        arrange(actor);
        e.begin(w, c, skill, [...w.heroes.values()][0]);
        await sample({
          group: 'hong-liet',
          skill,
          actor,
          form: 'hoan_nhan_hong_liet',
          ms: Math.min(
            6000,
            ((e.cast.endsAt - w.tick) * 1000) / c.tickRate + 250,
          ),
        });
      }
      for (const [direction, fx, fy] of facings) {
        e.cast = undefined;
        e.effects.clear();
        e.nextActionAt = w.tick + 100000;
        const actor = w.creeps.get(e.bossId);
        arrange(actor, fx, fy);
        e.begin(w, c, 'hong_liet_a1', [...w.heroes.values()][0]);
        await sample({
          group: 'hong-liet',
          skill: 'hong_liet_a1-' + direction,
          actor,
          form: 'hoan_nhan_hong_liet',
          ms: 1600,
          primary: false,
        });
      }
    } else if (destination === 'kim_luan') {
      const e = zone.kim;
      e.spawn(w, c, 'kim_luan_phap_vuong');
      for (const skill of Object.keys(e.definition.abilities)) {
        e.casts.clear();
        e.effects.clear();
        e.next = new Map(
          [...w.creeps.keys()].map((id) => [id, w.tick + 100000]),
        );
        const id = /thiet_phien|cuong_phong|phien_trung/.test(skill)
          ? 'hoac_do'
          : /^dat_|^dai_luc|^bat_dong|hang_ma/.test(skill)
            ? 'dat_nhi_ba'
            : 'kim_luan_phap_vuong';
        const actor = w.creeps.get(id);
        arrange(actor);
        e.begin(w, c, id, skill, [...w.heroes.values()][0]);
        const cast = e.casts.get(id);
        assert(cast, skill + ' cast');
        await sample({
          group: 'kim',
          skill,
          actor,
          form: id === 'kim_luan_phap_vuong' ? 'kim_luan' : id,
          ms: Math.min(
            6500,
            ((cast.endsAt - w.tick) * 1000) / c.tickRate + 200,
          ),
        });
      }
      for (const [id, skill] of [
        ['hoac_do', 'thiet_phien_lien_hoan'],
        ['dat_nhi_ba', 'dat_sweep'],
        ['kim_luan_phap_vuong', 'kim_hand_chop'],
      ])
        for (const [direction, fx, fy] of facings) {
          e.casts.clear();
          e.effects.clear();
          e.next = new Map(
            [...w.creeps.keys()].map((id) => [id, w.tick + 100000]),
          );
          const actor = w.creeps.get(id);
          arrange(actor, fx, fy);
          e.begin(w, c, id, skill, [...w.heroes.values()][0]);
          await sample({
            group: 'kim',
            skill: skill + '-' + direction,
            actor,
            form: id === 'kim_luan_phap_vuong' ? 'kim_luan' : id,
            ms: 1600,
            primary: false,
          });
        }
    } else {
      const d = c.bossEncounter;
      for (const attack of d.attacks) {
        const actor = w.creeps.get(w.boss.actorId);
        arrange(actor, 1, 0, Math.min(70, attack.range ?? 70));
        w.boss.cast = undefined;
        w.boss.cooldowns = {};
        actor.cooldown = attack.id === 'ly_mac_sau_basic' ? 0 : w.tick + 100000;
        w.boss.rotation = d.rotation.indexOf(attack.id);
        w.boss.nextActionAt =
          attack.id === 'ly_mac_sau_basic' ? w.tick + 100000 : w.tick;
        assert(w.boss.rotation >= 0 || attack.id === 'ly_mac_sau_basic');
        await sample({
          group: 'ly-mac-sau',
          skill: attack.id,
          actor,
          form: 'ly_mac_sau',
          ms: Math.max(
            1500,
            ((attack.windupTicks + attack.recoveryTicks) * 1000) / c.tickRate +
              500,
          ),
        });
      }
      for (const [direction, fx, fy] of facings) {
        const actor = w.creeps.get(w.boss.actorId);
        arrange(actor, fx, fy, 60);
        w.boss.cast = undefined;
        w.boss.cooldowns = {};
        actor.cooldown = w.tick + 100000;
        w.boss.rotation = d.rotation.indexOf('phat_tran_cong');
        w.boss.nextActionAt = w.tick;
        await sample({
          group: 'ly-mac-sau',
          skill: 'phat_tran_cong-' + direction,
          actor,
          form: 'ly_mac_sau',
          ms: 1600,
          primary: false,
        });
      }
    }
  }
  exitAll();
  report.forms = [...seen];
  report.status = 'PASS';
  writeFileSync(
    resolve(out, 'boss-matrix.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  return report;
}
