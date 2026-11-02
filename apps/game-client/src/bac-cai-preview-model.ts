/** Director's final brief as art choreography. Never imported by simulation/server. */
import {
  bacCaiPreviewTiming as timing,
  cloneRoundMs,
  cloneShuffleEnd,
  cloneDecisionAt,
  clonePreviewDuration,
  cloneSlot,
} from './bac-cai-preview-tuning.js';
export type Facing = 'right' | 'down' | 'left' | 'up';
export type Outcome = 'success' | 'failure';
export const previews = [
  ['entrance', 'Từ phương Bắc', 4000],
  ['staff', 'Đả Cẩu Bổng Pháp', 3200],
  ['palms', 'Hàng Long 18 Chưởng', 3200],
  ['beam', 'Đả Cẩu Bổng Kích', 2000],
  ['dogs', 'Bổng Đả Ác Khuyển', 6000],
  ['clones', 'Mục Hạ Vô Nhân', clonePreviewDuration],
  ['vortex', 'Thiên Hạ Vô Cẩu', 5200],
  ['tether', 'Kháng Long Hữu Hối', 5500],
  ['field', 'Kiến Long Tại Điền', 2600],
  ['spiral', 'Phi Long Tại Thiên', 6000],
  ['preferences', 'Sở thích Hồng Thất Công', 25000],
] as const;
export type PreviewId = (typeof previews)[number][0];
export interface Layer {
  id: string;
  asset: string;
  tag: string;
  x: number;
  y: number;
  clock: number;
  loop?: boolean;
  alpha?: number;
  angle?: number;
  sx?: number;
  sy?: number;
  flip?: boolean;
  origin?: [number, number];
  depth?: number;
  frame?: number;
}
export interface Caption {
  id: string;
  text: string;
  x: number;
  y: number;
  color?: string;
}
export interface PreviewState {
  phase: string;
  layers: Layer[];
  captions: Caption[];
  duration: number;
  immune: boolean;
  swaps: number;
  realSlot: number;
  bossHp: number;
  dogHp: number[];
  tetherActive: boolean;
  preference: number;
  votes: number[];
  sleepRemaining: number;
  spiralRadius: number;
  note: string;
  bossAction: PreviewId;
  dragonReleased: boolean;
}
export const ids = {
  boss: 'boss_bac_cai',
  extra: 'bac_cai_rework_character',
  dog: 'bac_cai_black_dog',
  fx: 'bac_cai_rework_vfx',
  staff: 'bac_cai_staff',
  palm: 'bac_cai_dragon_palms',
  shared: 'bac_cai_shared',
  ultimate: 'bac_cai_ultimate',
  beam: 'bac_cai_beam_v03',
};
const vectors: Record<Facing, [number, number]> = {
  right: [1, 0],
  down: [0, 1],
  left: [-1, 0],
  up: [0, -1],
};
const lerp = (a: number, b: number, p: number) =>
  a + (b - a) * Math.max(0, Math.min(1, p));
const smooth = (p: number) => {
  const t = Math.max(0, Math.min(1, p));
  return t * t * (3 - 2 * t);
};
const names = [
  'Rượu ngon',
  'Mỹ nhân',
  'Thịt gà',
  'Thịt lợn',
  'Đánh cờ',
  'Tỉ võ',
];
const quotes = [
  'Có bầu rượu ngon, lão ăn mày chẳng cần gì nữa!',
  'Hoa đẹp đến đâu cũng thua một nụ cười mỹ nhân!',
  'Gà nướng thơm thế này, mau mang lại đây!',
  'Một đĩa thịt lợn quay, nhớ để phần da giòn!',
  'Mang bàn cờ ra, xem ai thắng được lão phu!',
  'Ăn uống đủ rồi, có ai dám tỉ võ với ta?',
];
const heroKeys = [
  'hero_cai_bang',
  'hero_thien_son',
  'hero_vo_dang',
  'hero_thieu_lam',
  'hero_cai_bang',
  'hero_thien_son',
];

export function previewState(
  id: PreviewId,
  time: number,
  facing: Facing = 'right',
  outcome: Outcome = 'success',
  players = 6,
): PreviewState {
  const duration = previews.find((p) => p[0] === id)![2];
  const t = Math.max(0, Math.min(time, duration));
  const s: PreviewState = {
    phase: '',
    layers: [],
    captions: [],
    duration,
    immune: false,
    swaps: 0,
    realSlot: 0,
    bossHp: 70,
    dogHp: [],
    tetherActive: false,
    preference: -1,
    votes: [],
    sleepRemaining: 0,
    spiralRadius: 0,
    note: '',
    bossAction: id,
    dragonReleased: false,
  };
  const [vx, vy] = vectors[facing];
  const angle = (Math.atan2(vy, vx) * 180) / Math.PI;
  const layer = (l: Layer) => s.layers.push(l);
  const body = (
    tag: string,
    x = 640,
    y = 350,
    clock = t,
    asset: string = ids.boss,
    frame?: number,
    id = 'boss',
  ) =>
    layer({
      id,
      asset,
      tag,
      x,
      y,
      clock,
      loop: true,
      ...(frame === undefined ? {} : { frame }),
    });
  const fx = (
    name: string,
    asset: string,
    tag: string,
    x: number,
    y: number,
    clock = t,
    opts: Partial<Layer> = {},
  ) =>
    layer({
      id: name,
      asset,
      tag,
      x,
      y,
      clock,
      loop: true,
      depth: y + 2,
      ...opts,
    });
  const caption = (
    text: string,
    x = 640,
    y = 235,
    id = 'dialog',
    color = '#ffe2a0',
  ) => s.captions.push({ id, text, x, y, color });
  const positions: [number, number][] = [
    [800, 340],
    [480, 390],
    [820, 460],
    [450, 510],
    [680, 510],
    [650, 215],
  ];
  let bx = 640,
    by = 350,
    pose = 'idle_' + facing,
    clock = t,
    asset: string = ids.boss,
    frame: number | undefined;
  // A separate action channel: dialogue and detached VFX do not own the body.
  const concurrentAttack = (elapsed: number) => {
    const cycle = elapsed % 4000;
    const actionId = cycle < 2000 ? 'beam' : 'palms';
    const action = previewState(
      actionId,
      cycle < 2000 ? cycle : cycle - 2000,
      facing,
      outcome,
      players,
    );
    const actor = action.layers.find((l) => l.id === 'boss')!;
    bx = actor.x;
    by = actor.y;
    pose = actor.tag;
    clock = actor.clock;
    asset = actor.asset;
    frame = actor.frame;
    for (const l of action.layers)
      if (l.id !== 'boss' && !l.id.startsWith('hero-'))
        layer({ ...l, id: 'concurrent-' + l.id });
    s.bossAction = actionId;
    return actionId === 'beam' ? 'Đả Cẩu Bổng Kích' : 'Hàng Long 18 Chưởng';
  };
  for (let i = 0; i < players; i++) {
    let [x, y] = positions[i]!;
    let state = 'idle';
    let d: Facing = x < 640 ? 'right' : 'left';
    if (id === 'vortex') {
      const p = smooth(t / 3500) * 0.88;
      x = lerp(x, 640, p);
      y = lerp(y, 350, p);
      state = t < 3500 ? 'walk' : 'idle';
    }
    if (id === 'tether' && players > 1 && i < 2) {
      const p = smooth(t / 600);
      x = lerp(x, 640 + (i === 0 ? -48 : 48), p);
      y = lerp(y, 420, p);
      if (t > 1300 && outcome === 'success') {
        x = lerp(
          640 + (i === 0 ? -48 : 48),
          640 + (i === 0 ? -210 : 210),
          smooth((t - 1300) / 2000),
        );
        state = t < 3300 ? 'walk' : 'idle';
      }
      d = i === 0 ? 'left' : 'right';
    }
    if (id === 'preferences' && t >= 10800) {
      const choice =
        outcome === 'success' ? [1, 1, 1, 1, 0, 2][i]! : [0, 0, 0, 0, 1, 2][i]!;
      x = lerp(
        x,
        460 + choice * 180 + (i % 2) * 18 - 9,
        smooth((t - 10800) / 1800),
      );
      y = lerp(y, 475 + (i % 3) * 15, smooth((t - 10800) / 1800));
      state = t < 12600 ? 'walk' : 'idle';
      d = 'up';
      if (t >= 14000 && outcome === 'success') {
        const approach = smooth((t - 14000) / 1200);
        x = lerp(x, 605 + (i % 3) * 35, approach);
        y = lerp(y, 390 + Math.floor(i / 3) * 38, approach);
        state = t < 15200 ? 'walk' : t < 24000 ? 'basic_attack' : 'idle';
      }
    }
    if (id === 'dogs' && i < 4 && t >= 3000 && t < 4200) {
      state = 'basic_attack';
      d = 'left';
    }
    layer({
      id: 'hero-' + i,
      asset: heroKeys[i]!,
      tag: `${state}_${d}`,
      x,
      y,
      clock: t,
      loop: true,
    });
    if (id === 'tether' && players > 1 && i < 2)
      caption(
        i === 0 ? 'Người được nối 1' : 'Người được nối 2',
        x,
        y + 20,
        'hero-label-' + i,
        '#f7bea6',
      );
  }
  switch (id) {
    case 'entrance':
      bx = lerp(820, 640, smooth(t / 3000));
      by = lerp(80, 350, smooth(t / 3000));
      pose = t < 3000 ? 'walk_down' : 'palm_stance_down';
      s.phase =
        t < 3000
          ? 'Bắc Cái đi từ hướng bắc vào arena chính'
          : 'Chuyển thế chưởng — chỉ tìm người chơi';
      caption('Lão ăn mày đến tìm người tỉ võ!', bx, by - 100);
      s.note = 'Dùng arena chính hiện có. Không đánh statue.';
      break;
    case 'staff': {
      const p = t % 800;
      bx = 640 + vx * (Math.floor(t / 800) * 30 + lerp(0, 30, p / 400));
      by = 350 + vy * (Math.floor(t / 800) * 30 + lerp(0, 30, p / 400));
      pose = 'staff_combo_' + facing;
      clock = p;
      fx(
        'sweep',
        ids.staff,
        'staff_slash',
        bx + vx * 24,
        by + vy * 24 - 24,
        p,
        { angle, alpha: 0.85 },
      );
      s.phase = 'Quét gậy tre liên tục + lướt về phía trước';
      break;
    }
    case 'palms': {
      pose = 'dragon_release_' + facing;
      clock = t % 800;
      const p = (t % 1000) / 1000;
      fx(
        'dragon-head',
        ids.palm,
        'dragon_projectile',
        640 + vx * (30 + p * 430),
        324 + vy * (30 + p * 430),
        t,
        { angle },
      );
      s.phase = 'Đầu rồng phóng từ tay — bay thẳng theo hướng lúc phóng';
      break;
    }
    case 'beam':
      s.phase =
        t < 350
          ? 'Cảnh báo ngắn · 0,35 giây (nhịp demo)'
          : 'Chọc gậy như chọc bi-a → tia kình khí thẳng, rất dài';
      if (facing === 'right') {
        if (t < timing.beam.recoverMs) {
          asset = ids.extra;
          pose = 'staff_thrust_right';
          clock = t;
          frame = t < 230 ? 0 : t < 350 ? 1 : t < 500 ? 2 : 3;
        }
      } else {
        pose = 'staff_combo_' + facing;
        s.note =
          'Pose bi-a mới hiện có hướng phải; hướng này đang dùng pose gậy cũ để đối chiếu.';
      }
      if (t < 350)
        fx(
          'warning',
          ids.shared,
          'direction_warning',
          640 + vx * 300,
          330 + vy * 300,
          t,
          { sx: 5, sy: 0.3, angle, alpha: 0.65, depth: 10 },
        );
      if (
        t >= timing.beam.warningMs &&
        t < timing.beam.warningMs + timing.beam.activeMs
      )
        fx(
          'beam',
          ids.beam,
          'qi_beam',
          640 + vx * 15,
          330 + vy * 15,
          t - timing.beam.warningMs,
          {
            sx: 1,
            sy: 1,
            angle,
            loop: false,
          },
        );
      break;
    case 'dogs':
      pose = 'staff_combo_' + facing;
      s.phase =
        t < 800
          ? 'Triệu hồi đúng 4 chó đen'
          : t < 3000
            ? 'Chó đuổi tới, lao cắn người chơi'
            : t < 4000
              ? 'Người chơi đánh trả — chó bị thương và mất HP'
              : 'Chó hết HP → ngã chết';
      for (let i = 0; i < 4; i++) {
        const [tx, ty] = positions[i]!;
        const p = smooth((t - 400) / 1600);
        const x = lerp(600 + (i % 2) * 80, tx - 30, p),
          y = lerp(325 + Math.floor(i / 2) * 45, ty, p);
        const hp = t < 2800 ? 100 : Math.max(0, 100 - (t - 2800) / 12);
        s.dogHp.push(hp);
        let tag =
          t < 800
            ? 'idle_right'
            : t < 2200
              ? 'walk_right'
              : t < 3000
                ? 'bite_right'
                : t < 4000
                  ? 'hurt_right'
                  : 'death_right';
        const start = t < 2200 ? 800 : t < 3000 ? 2200 : t < 4000 ? 3000 : 4000;
        layer({
          id: 'dog-' + i,
          asset: ids.dog,
          tag,
          x,
          y,
          clock: Math.max(0, t - start),
          loop: t < 3000,
          flip: tx < 640,
        });
        if (t < 800)
          fx('summon-' + i, ids.fx, 'clone_smoke', x, y - 12, t, {
            sx: 0.6,
            sy: 0.6,
            alpha: 0.7,
          });
        if (t >= 3000 && t < 3600)
          fx('dog-hit-' + i, ids.shared, 'boss_hit', x, y - 15, t - 3000, {
            sx: 0.4,
            sy: 0.4,
          });
        caption(
          `Chó ${i + 1} · ${Math.round(hp)}%`,
          x,
          y + 14,
          'dog-hp-' + i,
          hp > 0 ? '#d9d7c5' : '#bca58e',
        );
      }
      s.note =
        'Chó có HP, nhận đòn và chết. Đây là chuỗi hình minh họa; chưa có combat server. Chó mới hiện có hướng phải, trái dùng lật ngang.';
      break;
    case 'clones': {
      const corners = Array.from({ length: 8 }, (_, i) => ({
        x: 640 + Math.cos((i * Math.PI) / 4) * 265,
        y: 350 + Math.sin((i * Math.PI) / 4) * 165,
      }));
      const shuffleStart = timing.clones.splitMs,
        swapMs = cloneRoundMs,
        shuffleEnd = cloneShuffleEnd;
      s.immune = t >= shuffleStart && t < shuffleEnd;
      s.swaps = Math.min(
        5,
        Math.max(0, Math.floor((t - shuffleStart) / swapMs)),
      );
      s.realSlot = cloneSlot(0, s.swaps);
      s.phase =
        t < shuffleStart
          ? 'Phân thân — theo dõi chân thân bay chậm về một góc'
          : t < shuffleEnd
            ? `Tráo đổi ${Math.min(5, s.swaps + 1)}/5 · miễn nhiễm sát thương`
            : t < cloneDecisionAt
              ? 'Đã tráo đổi đủ 5 lần — đánh trúng ai?'
              : outcome === 'success'
                ? 'Trúng chân thân → phân thân biến mất'
                : 'Trúng phân thân → nổ, sát thương toàn map';
      for (let i = 0; i < 8; i++) {
        if (t >= cloneDecisionAt && outcome === 'success' && i !== 0) continue;
        let slot = i,
          previous = i,
          p = 1;
        if (t >= shuffleStart) {
          const step = Math.min(4, Math.floor((t - shuffleStart) / swapMs));
          previous = cloneSlot(i, step);
          slot = cloneSlot(i, step + 1);
          const pairIndex = timing.clones.pairs[step]!.findIndex(
            (pair) => pair[0] === previous || pair[1] === previous,
          );
          p =
            t >= shuffleEnd
              ? 1
              : smooth(
                  (((t - shuffleStart) % swapMs) -
                    pairIndex * timing.clones.pairStaggerMs) /
                    timing.clones.moveMs,
                );
        }
        const a = corners[previous]!,
          b = corners[slot]!;
        const split = smooth(t / shuffleStart);
        // During splitting only the original leaves the center. Copies appear
        // at their corners, giving the player a real path to follow before swaps.
        const arriving = t < shuffleStart && i === 0;
        const x = arriving ? lerp(640, b.x, split) : lerp(a.x, b.x, p),
          y = arriving
            ? lerp(350, b.y, split) - Math.sin(split * Math.PI) * 18
            : lerp(a.y, b.y, p);
        body('idle_down', x, y, t, ids.boss, undefined, 'clone-' + i);
        if (t < shuffleStart && i !== 0)
          s.layers[s.layers.length - 1]!.alpha = smooth(t / 500);
        if (t < 500 || t >= cloneDecisionAt)
          fx(
            'clone-fx-' + i,
            ids.fx,
            'clone_smoke',
            x,
            y - 20,
            t < 500 ? t : t - cloneDecisionAt,
            { sx: 0.7, sy: 0.7, alpha: 0.6, loop: false },
          );
      }
      if (t >= cloneDecisionAt && outcome === 'failure') {
        fx(
          'world-blast',
          ids.ultimate,
          'final_dragon_burst',
          640,
          350,
          t - cloneDecisionAt,
          { sx: 3.5, sy: 2.5, alpha: 0.6, loop: false },
        );
        positions.slice(0, players).forEach(([x, y], i) => {
          fx(
            'map-hit-' + i,
            ids.shared,
            'boss_hit',
            x,
            y - 20,
            t - cloneDecisionAt,
            {
              sx: 0.6,
              sy: 0.6,
              loop: false,
            },
          );
          caption('−HP', x, y - 70, 'damage-' + i, '#ff8977');
        });
      }
      s.note =
        'Tráo chéo theo từng cặp, 1,4 giây di chuyển + nhịp nghỉ; đúng 5 lượt. Các cặp khởi hành lệch nhẹ để dễ theo dõi.';
      return s;
    }
    case 'vortex':
      bx = 640;
      by = 350;
      pose =
        t < 3500
          ? 'staff_spin_' +
            ['down', 'left', 'up', 'right'][Math.floor(t / 120) % 4]!
          : 'staff_basic_down';
      clock = t < 3500 ? t : t - 3500;
      s.phase =
        t < 3500
          ? 'Xoay ở chính giữa — hút người chơi toàn map'
          : 'Đập gậy xuống đất → dmg lan + stun';
      if (t < 3500)
        for (let i = 0; i < 10; i++) {
          const p = ((t + i * 200) % 1600) / 1600,
            a = (i * Math.PI) / 5;
          fx(
            'inflow-' + i,
            ids.staff,
            'knockback_wake',
            640 + Math.cos(a) * 320 * (1 - p),
            350 + Math.sin(a) * 190 * (1 - p),
            t + i * 100,
            {
              angle: (a * 180) / Math.PI + 180,
              sx: 0.65,
              sy: 0.45,
              alpha: 0.5,
            },
          );
        }
      fx(
        'vortex',
        ids.staff,
        t < 3500 ? 'staff_whirlwind' : 'ground_smash',
        640,
        350,
        t < 3500 ? t : t - 3500,
        { sx: 2.1, sy: 1.5, alpha: 0.8, loop: t < 3500, depth: 15 },
      );
      if (t >= 3500)
        positions
          .slice(0, players)
          .forEach((_, i) =>
            caption(
              'Choáng',
              640 + ((i % 3) - 1) * 65,
              355 + Math.floor(i / 3) * 28,
              'stun-' + i,
              '#ffda79',
            ),
          );
      break;
    case 'tether':
      pose = 'dragon_charge_' + facing;
      s.phase =
        players < 2
          ? 'Một người chơi → không có Kháng Long Hữu Hối'
          : t < 600
            ? 'Hút hai người được chọn đến gần boss'
            : t < 1300
              ? 'Dây nối giữa hai người — bắt đầu rút máu'
              : outcome === 'success'
                ? 'Hai người chạy xa nhau → đứt dây'
                : 'Không tách đủ xa → máu tiếp tục rút';
      s.tetherActive =
        players > 1 && t >= 600 && (outcome === 'failure' || t < 3100);
      if (s.tetherActive) {
        const a = s.layers.find((l) => l.id === 'hero-0')!,
          b = s.layers.find((l) => l.id === 'hero-1')!;
        fx(
          'pair-rope',
          ids.fx,
          'pair_tether',
          (a.x + b.x) / 2,
          (a.y + b.y) / 2 - 25,
          t,
          { sx: Math.abs(b.x - a.x) / 132, sy: 0.4 },
        );
        if (t > 1300)
          for (let i = 0; i < 2; i++) {
            const h = s.layers[i]!;
            caption('−HP', h.x, h.y - 65, 'drain-' + i, '#ff9a82');
          }
      }
      if (players > 1 && outcome === 'success' && t >= 3100)
        caption('Dây đã đứt — ngừng rút máu', 640, 280);
      s.note =
        'Ngẫu nhiên và HP thật sẽ do server quyết định. Demo dùng cặp cố định để xem rõ hình.';
      break;
    case 'field':
      s.phase =
        t < 450
          ? 'Nhảy cực nhanh tới một người chơi'
          : 'Chưởng xuống đất — vùng sát thương chữ 田 rộng';
      bx = lerp(640, 820, smooth(t / 350));
      by = lerp(350, 460, smooth(t / 350));
      pose = 'jumping_palm_' + facing;
      clock = t;
      if (t < timing.field.recoverMs) frame = Math.min(3, Math.floor(t / 160));
      else pose = 'idle_' + facing;
      if (t >= 360)
        fx('field', ids.fx, 'field_impact', 820, 460, t - 360, {
          sx: 2.7,
          sy: 2,
          alpha: timing.field.groundAlpha,
          loop: false,
          depth: 20,
        });
      break;
    case 'spiral': {
      const release = timing.spiral.releaseMs;
      if (t < timing.spiral.castEndMs) {
        pose = 'dragon_release_' + facing;
        clock = t;
        frame = Math.min(3, Math.floor(t / 120));
        s.phase = 'Thả rồng lửa — một lần xuất chưởng';
      } else {
        const action = concurrentAttack(t - timing.spiral.castEndMs);
        s.phase = `Rồng tự xoay — Hồng Thất Công đang đánh ${action}`;
      }
      s.dragonReleased = t >= release;
      const spiral = (ms: number) => {
        const p = Math.max(0, ms) / timing.spiral.flightMs,
          a = -Math.PI / 2 + p * Math.PI * 6,
          r = 35 + p * 290;
        return {
          x: 640 + Math.cos(a) * r,
          y: 350 + Math.sin(a) * r * 0.7,
          r,
          a,
        };
      };
      const flight = t - release;
      const head = spiral(flight);
      s.spiralRadius = t >= release ? head.r : 0;
      for (let i = 18; i >= 0; i--) {
        const back = flight - i * 38;
        if (back < 0) continue;
        const p = spiral(back);
        fx(
          'spiral-' + i,
          i === 0 ? ids.fx : ids.palm,
          i === 0 ? 'fire_dragon' : 'dragon_trail',
          p.x,
          p.y,
          t + i * 50,
          {
            angle: ((p.a + Math.PI / 2) * 180) / Math.PI,
            sx: i === 0 ? 1 : 0.42,
            sy: i === 0 ? 1 : 0.42,
            alpha: i === 0 ? 1 : (1 - i / 20) * 0.4,
          },
        );
      }
      s.note =
        'Rồng duy trì quỹ đạo độc lập sau khi thả; Hồng Thất Công tiếp tục thi triển chiêu khác.';
      break;
    }
    case 'preferences': {
      s.preference = Math.min(5, Math.floor(t / 1800));
      s.phase =
        t < 10800
          ? 'Sở thích thay đổi trong lúc boss vẫn chiến đấu'
          : t < 14000
            ? 'Ba ô trên sân — đi vào để biểu quyết theo số đông'
            : outcome === 'success'
              ? 'Đúng sở thích cuối cùng → ngủ 10 giây, nhận free dmg'
              : 'Chọn sai → thất vọng, uống rượu hồi 10% HP';
      if (t < 14000) {
        const action = concurrentAttack(t);
        s.phase += ` · ${action}`;
      }
      if (t < 10800) caption(quotes[s.preference]!, bx, by - 105);
      else if (t < 14000) {
        caption('Chọn điều lão phu vừa nói!', 640, 230);
        const options = [0, 5, 2];
        options.forEach((n, i) => {
          fx(
            'choice-' + i,
            ids.shared,
            'landing_warning',
            460 + i * 180,
            500,
            t,
            { sx: 0.9, sy: 0.65, alpha: 0.75, depth: 5 },
          );
          caption(names[n]!, 460 + i * 180, 550, 'choice-name-' + i);
        });
        const assignments =
          outcome === 'success' ? [1, 1, 1, 1, 0, 2] : [0, 0, 0, 0, 1, 2];
        s.votes = [0, 0, 0];
        for (const vote of assignments.slice(0, players)) s.votes[vote]!++;
      } else if (outcome === 'success') {
        asset = ids.extra;
        pose = 'sleep_down';
        frame = t < 14400 ? 0 : t < 14800 ? 1 : 2;
        clock = t - 14000;
        s.sleepRemaining = Math.max(0, 24000 - t);
        caption(
          s.sleepRemaining > 0
            ? `Khò… còn ${(s.sleepRemaining / 1000).toFixed(1)}s`
            : 'Ngủ đủ 10 giây — tỉnh lại!',
          640,
          270,
        );
        if (t >= 24000) frame = 3;
        s.bossHp = Math.max(15, 70 - (t - 14000) / 180);
      } else {
        asset = ids.extra;
        pose = 'drink_down';
        clock = t - 14000;
        frame = Math.min(3, Math.floor(clock / 380));
        s.bossHp = t >= 15140 ? 80 : 70;
        caption(
          t >= 15140 ? '+10% HP' : 'Thật khiến lão phu thất vọng!',
          640,
          230,
          'dialog',
          t >= 15140 ? '#bceba5' : '#ffd0a3',
        );
      }
      s.note =
        'Rượu ngon · Mỹ nhân · Thịt gà · Thịt lợn · Đánh cờ · Tỉ võ. Biểu quyết và kết quả ở đây là storyboard.';
      break;
    }
  }
  body(pose, bx, by, clock, asset, frame);
  if (id === 'field') s.layers[s.layers.length - 1]!.depth = by + 1;
  return s;
}
