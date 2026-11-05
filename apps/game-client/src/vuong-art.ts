import Phaser from 'phaser';
import { presentRenovatedBody } from './renovation-art.js';
import type { LobbyState } from '@volam/game-protocol';
import { vuongElements, vuongNotes, type VuongView } from '@volam/game-core';
import { WaveBossHealth } from './wave-boss-feedback-art.js';

const body = 'vtd-body';
const effects = 'vtd-effects';
const labels = {
  counter: 'Toàn Chân Phản Kiếm',
  stars: 'Bắc Đẩu Kiếm Trận',
  swords: 'Huyền Vũ Kiếm Trận',
  pulse: 'Tiên Thiên Chấn Mạch',
  tam: 'Nhất Khí Hóa Tam Thanh',
};

export function preloadVuongArt(scene: Phaser.Scene) {
  for (const [key, file] of [
    [body, 'body'],
    [effects, 'effects'],
  ]) {
    const path = '/assets/vuong-trung-duong/' + file;
    scene.load.atlas(key!, path + '.png', path + '.json');
  }
}

export class VuongArt {
  private images = new Map<string, Phaser.GameObjects.Image>();
  private text = new Map<string, Phaser.GameObjects.Text>();
  private used = new Set<string>();
  private observed = new Set<string>();
  private health: WaveBossHealth;
  private receivedAt = 0;
  private view: VuongView | undefined;
  private spoken = '';
  private stormTinted = false;
  constructor(
    private scene: Phaser.Scene,
    private restorePalette: () => void,
  ) {
    this.health = new WaveBossHealth(scene);
    for (const key of [body, effects])
      scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  private sprite(
    id: string,
    key: string,
    frame: string,
    x: number,
    y: number,
    depth: number,
  ) {
    if (!this.scene.textures.get(key).has(frame)) return;
    let image = this.images.get(id);
    if (!image) {
      image = this.scene.add.image(x, y, key, frame).setName('vtd:' + id);
      this.images.set(id, image);
    }
    image.setTexture(key, frame).setPosition(x, y).setDepth(depth);
    this.used.add(id);
    this.observed.add(frame);
    return image;
  }
  private fx(
    id: string,
    frame: string,
    x: number,
    y: number,
    w: number,
    h = w,
    depth = 25,
  ) {
    return this.sprite(id, effects, frame, x, y, depth)
      ?.setOrigin(0.5)
      .setDisplaySize(w, h)
      .setRotation(0)
      .setAlpha(1);
  }
  private label(
    id: string,
    value: string,
    x: number,
    y: number,
    bright = false,
  ) {
    let text = this.text.get(id);
    if (!text) {
      text = this.scene.add
        .text(x, y, value, {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '13px',
          color: '#ffe9af',
          stroke: '#201824',
          strokeThickness: 4,
          resolution: 2,
        })
        .setOrigin(0.5)
        .setName('vtd:' + id);
      this.text.set(id, text);
    }
    text
      .setText(value)
      .setPosition(x, y)
      .setColor(bright ? '#fffad5' : '#ead9ad')
      .setDepth(18500);
    this.used.add(id);
    return text;
  }
  private callout(id: string, value: string, x: number, y: number) {
    const text = this.label(id, value, x, y, true);
    const view = this.scene.cameras.main.worldView;
    const side = Math.min(view.width / 2, text.width / 2 + 12);
    const inset = Math.min(68, view.height / 3);
    text.setPosition(
      Phaser.Math.Clamp(x, view.left + side, view.right - side),
      Phaser.Math.Clamp(y, view.top + inset, view.bottom - inset),
    );
  }
  private actor(v: VuongView, now: number) {
    const phase = v.phase;
    const side = Math.abs(v.fx) > Math.abs(v.fy);
    const facing = side ? 'right' : v.fy < 0 ? 'up' : 'down';
    const a = v.action;
    const elapsed = a ? Math.max(0, ((now - a.start) * 1000) / v.rate) : 0;
    let pose = 'idle';
    if (v.pose === 'death' || v.transitionUntil > now) {
      const dead = v.pose === 'death';
      const duration = v.rate * (dead ? 0.9 : 1.1);
      const end = dead ? v.corpseUntil : v.transitionUntil;
      const index = Math.max(
        0,
        Math.min(3, Math.floor((1 - (end - now) / duration) * 4)),
      );
      const retainedBody = this.sprite(
        'actor',
        body,
        (dead ? 'defeat_' : 'transition_') + index,
        v.x,
        v.y,
        v.y,
      )
        ?.setOrigin(0.5, 90 / 112)
        .setFlipX(v.fx < 0)
        .setScale(1);
      presentRenovatedBody(
        this.scene,
        retainedBody,
        'vuong_trung_duong_p' + phase,
        'action',
        v.fx,
        v.fy,
        a?.skill,
      );
      return;
    } else if (v.pose === 'hurt') pose = 'hurt';
    else if (a?.skill === 'counter' && v.qteOutcome !== 'failed')
      pose = 'raise';
    else if (v.qteOutcome === 'failed') pose = 'release';
    else if (a) {
      const fromRelease = ((now - a.next) * 1000) / v.rate;
      pose =
        fromRelease >= -95 && fromRelease < 165
          ? 'release'
          : elapsed > 160 && a.stage > 0
            ? 'recover'
            : 'windup';
    } else if (now - v.releasedAt < v.rate * 0.3)
      pose = now - v.releasedAt < v.rate * 0.11 ? 'release' : 'recover';
    else if (v.pose === 'walk')
      pose = 'walk_' + (Math.floor((now * 5) / v.rate) % 2);
    const candidates = [
      `p${phase}_${facing}_${pose}`,
      `p${phase}_right_${pose}`,
      `p${phase}_${facing}_idle`,
      `p${phase}_right_idle`,
    ];
    const frame = candidates.find((name) =>
      this.scene.textures.get(body).has(name),
    )!;
    const renovatedBody = this.sprite('actor', body, frame, v.x, v.y, v.y)
      ?.setOrigin(0.5, 90 / 112)
      .setFlipX(side && v.fx < 0)
      .setScale(1);
    presentRenovatedBody(
      this.scene,
      renovatedBody,
      'vuong_trung_duong_p' + phase,
      pose === 'idle' ? 'idle' : pose.startsWith('walk_') ? 'walk' : 'action',
      v.fx,
      v.fy,
      a?.skill,
    );
  }
  private cue(v: VuongView, e: VuongView['cues'][number], now: number) {
    const id = String(e.id);
    const warning = now < e.at;
    const phase = v.phase;
    const fade = warning
      ? 0.65 + Math.sin(now * 0.4) * 0.17
      : Math.max(0.2, Math.min(1, (e.until - now) / 5));
    if (e.velocity) {
      const frame = (e.kind === 'crescent' ? 'slash' : 'thrust') + phase;
      this.fx(
        id,
        frame,
        e.x,
        e.y - 8,
        e.kind === 'crescent' ? 82 : 74,
        undefined,
        e.y + 6,
      )?.setRotation(Math.atan2(e.velocity.y, e.velocity.x));
      return;
    }
    if (e.kind === 'slash' && e.end) {
      const angle = Math.atan2(e.end.y - e.y, e.end.x - e.x);
      this.fx(
        id,
        'slash' + phase,
        e.x + Math.cos(angle) * e.radius * 0.52,
        e.y + Math.sin(angle) * e.radius * 0.52,
        e.radius * 1.58,
        e.radius * 2.05,
        e.y + 6,
      )
        ?.setRotation(angle)
        .setAlpha(fade);
      return;
    }
    if (e.end) {
      const dx = e.end.x - e.x,
        dy = e.end.y - e.y;
      const frame = warning
        ? 'line' + phase
        : e.kind === 'finger'
          ? 'finger'
          : 'thrust' + phase;
      this.fx(
        id,
        frame,
        e.x + dx / 2,
        e.y + dy / 2,
        Math.hypot(dx, dy) * 1.08,
        e.radius * (warning ? 4 : 5),
        31,
      )
        ?.setRotation(Math.atan2(dy, dx))
        .setAlpha(fade);
      return;
    }
    this.groundCue(e, id, warning, fade, ((e.at - now) * 1000) / v.rate);
  }
  private groundCue(
    e: VuongView['cues'][number],
    id: string,
    warning: boolean,
    fade: number,
    msUntil: number,
  ) {
    if (e.kind === 'lightning' || e.kind === 'rain') {
      this.fx(
        id + ':foot',
        e.kind === 'lightning' ? 'warning1' : 'warning2',
        e.x,
        e.y,
        e.radius * 2.25,
      )?.setAlpha(fade);
      if (!warning || (e.kind === 'rain' && msUntil < 180))
        this.fx(
          id,
          e.kind,
          e.x,
          e.y - 61 - Math.max(0, msUntil) * 0.64,
          120,
          145,
          e.y + 10,
        )?.setAlpha(fade);
      return;
    }
    if (e.kind === 'inner' || e.kind === 'outer') {
      this.fx(
        id,
        'pulse',
        e.x,
        e.y,
        e.radius * 2.2,
        e.radius * 2.2,
        30,
      )?.setAlpha(warning ? fade * 0.65 : fade);
      return;
    }
    const frame =
      e.kind === 'elements'
        ? 'impact' + e.index
        : e.kind === 'counter'
          ? 'slash1'
          : 'shatter';
    this.fx(id, frame, e.x, e.y, e.radius * 2, undefined, e.y + 8)?.setAlpha(
      fade,
    );
  }
  private say(key: string, message: string) {
    if (this.spoken === key) return;
    this.spoken = key;
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    const voice = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.startsWith('vi'));
    if (!voice) return;
    const phrase = new SpeechSynthesisUtterance(message);
    phrase.voice = voice;
    phrase.lang = 'vi-VN';
    window.speechSynthesis.speak(phrase);
  }
  sync(state: LobbyState | undefined, zone: string) {
    const raw =
      zone === 'arena' ? state?.vuong.get('arena')?.snapshot : undefined;
    if (!raw) {
      if (this.view) this.clear();
      return;
    }
    const v = JSON.parse(raw) as VuongView;
    if (v.tick !== this.view?.tick) this.receivedAt = this.scene.time.now;
    this.view = v;
    const elapsed = ((this.scene.time.now - this.receivedAt) * v.rate) / 1000;
    const now = v.tick + Math.min(v.state === 'defeated' ? v.rate : 4, elapsed);
    this.used.clear();
    this.health.begin();
    this.actor(v, now);
    if (v.hp > 0)
      this.health.draw(
        'vuong_trung_duong',
        'Vương Trùng Dương',
        v.x,
        v.y - 63,
        v.hp,
        v.maxHp,
      );
    this.health.end();
    if (v.shield) {
      this.fx('shield', 'shield', v.x, v.y - 31, 107, 94, v.y + 2)?.setAlpha(
        0.73,
      );
      if (v.shield < 3)
        this.fx(
          'crack',
          'crack' + (3 - v.shield),
          v.x,
          v.y - 31,
          105,
          94,
          v.y + 3,
        );
      this.label(
        'shieldLabel',
        `Cửu Âm Hộ Thể · ${3 - v.shield}/3`,
        v.x,
        v.y - 88,
      );
    }
    const action = v.action;
    const ground = this.scene.children.getByName('arena:ground') as
      Phaser.GameObjects.Image | undefined;
    if (v.phase === 1 && v.hp > 0 && ground) {
      this.stormTinted = true;
      ground.setTint(
        v.cues.some(
          (cue) =>
            cue.kind === 'lightning' && now >= cue.at && now - cue.at < 3,
        )
          ? 0xe1d8f8
          : 0xa29ab5,
      );
    } else if (this.stormTinted) {
      this.stormTinted = false;
      this.restorePalette();
    }
    if (action?.skill === 'pulse') {
      this.fx('inner-band', 'pulse', v.x, v.y, v.innerRadius * 2.17)?.setAlpha(
        0.28,
      );
      this.fx('outer-band', 'pulse', v.x, v.y, v.outerRadius * 2.17)?.setAlpha(
        0.28,
      );
    }
    if (action?.skill === 'counter')
      this.fx('yin', 'yin', v.center.x, v.center.y, 240, 218);
    if (v.qteOutcome)
      this.label(
        'qteOutcome',
        v.qteOutcome === 'success'
          ? 'Cả đội hóa giải'
          : 'Phản Kiếm · Cả đội chịu chém',
        v.center.x,
        v.center.y - 110,
        true,
      );
    if (action?.skill === 'elements') {
      const name = vuongElements[action.index]!;
      this.label(
        'elementCall',
        'Ngũ Hành · ' + name,
        v.center.x,
        v.center.y - 168,
        true,
      );
      this.say('element:' + action.start, name);
    }
    for (const [i, point] of v.elements.entries()) {
      this.fx(
        'element' + i,
        'element' + i,
        point.x,
        point.y,
        v.elementRadius * 2.3,
      );
      this.label('elementLabel' + i, vuongElements[i]!, point.x, point.y + 22);
    }
    for (const [i, point] of v.stars.entries()) {
      this.fx(
        'star' + i,
        i === v.eyeIndex ? 'eye' : 'star',
        point.x,
        point.y,
        i === v.eyeIndex ? 46 : 25,
      );
      if (i === v.eyeIndex)
        this.label('eyeLabel', 'Thiên Quyền', point.x, point.y - 20);
    }
    for (const sword of v.swords)
      this.fx(
        'sword' + sword.id,
        'sword',
        sword.point.x,
        sword.point.y - 28,
        88,
        100,
        sword.point.y + 1,
      );
    if (v.swords.length)
      this.label(
        'swordsLabel',
        `Dụ Nhất Dương Chỉ phá kiếm · ${v.swords.length} còn lại`,
        v.center.x,
        v.center.y - 182,
      );
    for (const [i, point] of v.noteSeals.entries()) {
      const highlighted = !!action?.stage && v.notes[action.stage - 1] === i;
      this.fx(
        'note' + i,
        'note' + i,
        point.x,
        point.y,
        v.noteRadius * 2.25,
      )?.setAlpha(highlighted ? 1 : 0.56);
      this.label(
        'noteLabel' + i,
        vuongNotes[i]!,
        point.x,
        point.y,
        highlighted,
      );
    }
    if (action?.skill === 'notes') {
      const sequence = v.notes.map((n) => vuongNotes[n]!).join(' · ');
      this.callout(
        'noteCall',
        action.stage
          ? `Nhịp ${action.stage}/${v.notes.length} · ${vuongNotes[v.notes[action.stage - 1]!]}`
          : sequence,
        v.center.x,
        v.center.y - 108,
      );
      this.say(
        'notes:' + action.start + ':' + action.stage,
        action.stage ? vuongNotes[v.notes[action.stage - 1]!]! : sequence,
      );
    }
    if (v.transitionUntil > now)
      this.label('phase', 'Tiên Thiên Công', v.x, v.y - 90, true);
    else if (v.exposedUntil > now)
      this.label('phase', 'Thiên Quyền đã vỡ', v.x, v.y - 90, true);
    else if (action && action.skill in labels)
      this.label(
        'phase',
        labels[action.skill as keyof typeof labels],
        v.x,
        v.y - (action.skill === 'stars' ? 126 : 90),
      );
    for (const e of v.cues) this.cue(v, e, now);
    for (const collection of [this.images, this.text])
      for (const [id, object] of collection)
        if (!this.used.has(id)) {
          object.destroy();
          collection.delete(id);
        }
  }
  clear() {
    for (const collection of [this.images, this.text]) {
      for (const object of collection.values()) object.destroy();
      collection.clear();
    }
    this.health.clear();
    if (this.stormTinted) {
      this.stormTinted = false;
      this.restorePalette();
    }
    this.view = undefined;
    this.spoken = '';
  }
  inspect() {
    const actor = this.images.get('actor');
    return {
      phase: this.view?.phase,
      frames: [...this.observed],
      visible: this.images.size,
      actor: actor
        ? {
            x: actor.x,
            y: actor.y,
            frame: actor.frame.name,
            origin: [actor.originX, actor.originY],
            depth: actor.depth,
            displayHeight: actor.displayHeight,
          }
        : null,
    };
  }
}
