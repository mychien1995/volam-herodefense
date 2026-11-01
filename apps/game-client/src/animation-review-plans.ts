/** Art choreography only. No combat rules, commands, hitboxes or live game tuning. */
export type ReviewDirection = 'right' | 'down' | 'left' | 'up';
export type ReviewBranch = 'threshold' | 'expiry';
export interface ReviewClip {
  asset: string;
  tag: string;
  at: number;
  end: number;
  body?: boolean;
  loop?: boolean;
  hold?: number;
  scale?: number;
  alpha?: number;
  angle?: number;
  facingSpace?: boolean;
  from?: [number, number];
  to?: [number, number];
  anchor?: 'start';
  ground?: boolean;
  insideOnly?: boolean;
  fade?: boolean;
  elevation?: number;
  phase: string;
}
export interface ReviewPlan {
  id: string;
  name: string;
  hero: string;
  duration: number;
  note: string;
  reference?: boolean;
  clips: ReviewClip[];
  motion?: { at: number; end: number; from: number; to: number }[];
}
export const reviewSkills = [
  ['lien_hoa_phien', 'Liên Hoa Phiến'],
  ['phong_anh_hoan_vi', 'Phong Ảnh Hoán Vị'],
  ['that_tinh_kiem', 'Thất Tinh Kiếm'],
  ['van_kiem_quy_tong', 'Vạn Kiếm Quy Tông'],
  ['toa_sat_bac_do', 'Tọa Sát Bác Đồ'],
  ['dai_luc_kim_cuong_chuong', 'Đại Lực Kim Cương Chưởng'],
  ['tam_gioi_quy_thien', 'Tam Giới Quy Thiền'],
  ['thieu_lam_dao', 'Thiếu Lâm Đao · đánh thường'],
  ['bat_dong_minh_vuong', 'Bất Động Minh Vương'],
  ['nhu_lai_thien_diep', 'Như Lai Thiên Diệp'],
  ['luc_duong_chuong', 'Lục Dương Chưởng · đối chiếu'],
  ['bach_phien_phong_bao', 'Bách Phiến Phong Bạo · đối chiếu'],
  ['phi_anh_tram', 'Phi Ảnh Trảm · đối chiếu'],
] as const;

export function reviewFrameIndex(
  durations: number[],
  time: number,
  loop: boolean,
): number {
  const total = durations.reduce((a, b) => a + b, 0);
  let t = loop ? Math.max(0, time) % total : Math.max(0, time);
  for (let i = 0; i < durations.length; i++) {
    if (t < durations[i]!) return i;
    t -= durations[i]!;
  }
  return durations.length - 1;
}

export function reviewMotion(plan: ReviewPlan, time: number): number {
  let position = 0;
  for (const m of plan.motion ?? []) {
    if (time < m.at) break;
    const progress = Math.min(1, (time - m.at) / (m.end - m.at));
    position = m.from + (m.to - m.from) * (1 - (1 - progress) ** 2);
  }
  return position;
}

/** Scripted incoming damage for the director's two storyboard branches, never live HP. */
export function reviewCounter(branch: ReviewBranch, time: number) {
  const hits =
    branch === 'threshold'
      ? [
          { at: 1000, raw: 200, received: 60 },
          { at: 1600, raw: 200, received: 60 },
          { at: 2200, raw: 200, received: 60 },
          { at: 2800, raw: 100, received: 30 },
        ]
      : [
          { at: 1000, raw: 200, received: 60 },
          { at: 2200, raw: 200, received: 60 },
          { at: 3400, raw: 100, received: 30 },
        ];
  const received = hits
    .filter((h) => h.at <= time)
    .reduce((a, h) => a + h.received, 0);
  return {
    maxHp: 1000,
    threshold: 200,
    reduction: 0.7,
    received,
    reflect: received,
    releaseAt: branch === 'threshold' ? 2800 : 5000,
    hits,
  };
}

export function animationReviewPlan(
  id: string,
  branch: ReviewBranch = 'threshold',
  exitLotus = true,
): ReviewPlan {
  if (!reviewSkills.some(([key]) => key === id))
    throw Error('Unknown review skill: ' + id);
  const clips: ReviewClip[] = [];
  const add = (
    asset: string,
    tag: string,
    at: number,
    end: number,
    phase: string,
    rest: Partial<ReviewClip> = {},
  ) => clips.push({ asset, tag, at, end, phase, ...rest });
  const body = (
    asset: string,
    tag: string,
    at: number,
    end: number,
    rest: Partial<ReviewClip> = {},
  ) => add(asset, tag, at, end, tag, { body: true, ...rest });
  const p: ReviewPlan = {
    id,
    name: reviewSkills.find(([key]) => key === id)![1],
    hero: 'hero_vo_dang_kiem',
    duration: 2200,
    note: '',
    clips,
  };
  const wind = 'thien_son_wind_actions_v2',
    fan = 'thien_son_fan_v2',
    dao = 'thien_son_dao_v2';
  const radial = (
    asset: string,
    tag: string,
    at: number,
    count: number,
    radius: number,
    scale = 1,
  ) => {
    for (let i = 0; i < count; i++) {
      const a = (i * Math.PI * 2) / count;
      add(asset, tag, at, at + 650, 'radial_release', {
        from: [Math.cos(a) * 30, Math.sin(a) * 30 - 22],
        to: [Math.cos(a) * radius, Math.sin(a) * radius - 22],
        angle: a,
        loop: true,
        scale,
        fade: true,
      });
    }
  };
  if (id === 'lien_hoa_phien') {
    p.hero = 'hero_thien_son';
    p.duration = 6200;
    p.note =
      'Hoa cố định tại điểm thi triển. Ánh bảo hộ / hồi máu chỉ hiện khi đứng trong hoa. Thời lượng 6s là nhịp preview.';
    body(wind + '_character', 'lien_hoa_phien_cast', 0, 280);
    add('review_lotus', 'opening', 0, 400, 'lotus_opening', {
      anchor: 'start',
      ground: true,
    });
    add('review_lotus', 'loop', 400, 5600, 'lotus_ground', {
      anchor: 'start',
      ground: true,
      loop: true,
    });
    add('review_lotus', 'loop', 5600, 6100, 'lotus_ending', {
      anchor: 'start',
      ground: true,
      loop: true,
      fade: true,
    });
    add(wind + '_aura', 'guard_loop', 400, 5600, 'protected_inside', {
      insideOnly: true,
      loop: true,
      alpha: 0.38,
      scale: 0.8,
    });
    if (exitLotus)
      p.motion = [
        { at: 1900, end: 2600, from: 0, to: 150 },
        { at: 3600, end: 4300, from: 150, to: 0 },
      ];
  } else if (id === 'phong_anh_hoan_vi' || id === 'phi_anh_tram') {
    p.hero = 'hero_thien_son_dao';
    p.duration = 1800;
    const backward = id === 'phong_anh_hoan_vi',
      distance = backward ? -140 : 140;
    p.reference = !backward;
    p.note = backward
      ? 'Thu người → lướt LÙI, giữ hướng nhìn → quang ảnh tan dần → hạ thế. Chỉ diễn chuyển động.'
      : 'Đối chiếu Phi Ảnh Trảm: lướt tiến, giữ nguyên gameplay.';
    p.motion = [{ at: 180, end: 520, from: 0, to: distance }];
    body(dao + '_character', id + '_cast', 0, 580);
    add(dao + '_aura', id + '_motion', 180, 550, 'dash_wind', {
      loop: true,
      alpha: 0.6,
    });
    for (let i = 0; i < 6; i++) {
      const at = 190 + i * 50,
        position = distance * (1 - (1 - (at - 180) / 340) ** 2);
      add(
        dao + '_afterimage',
        'moving_ghost',
        at,
        at + 560,
        'light_afterimage',
        {
          anchor: 'start',
          facingSpace: true,
          from: [position, 0],
          loop: true,
          alpha: 0.65 - i * 0.055,
          fade: true,
        },
      );
      if (backward)
        add(
          dao + '_character',
          'phong_anh_hoan_vi_cast',
          at,
          at + 480,
          'light_afterimage',
          {
            anchor: 'start',
            facingSpace: true,
            from: [position, 0],
            hold: 2,
            alpha: 0.62,
            fade: true,
          },
        );
    }
  } else if (id === 'that_tinh_kiem') {
    p.duration = 2600;
    p.note =
      'Bảy kiếm hiện thành chòm sao → bảy nhịp xuất kiếm → ánh sao va chạm. Không còn chỉ một vệt chém nhỏ.';
    body('that_tinh_kiem_character', 'cast', 0, 320);
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 7,
        at = 500 + i * 170;
      const start: [number, number] = [Math.cos(a) * 86, Math.sin(a) * 60 - 35];
      add('review_sword', 'travel', 140 + i * 45, at, 'seven_stars_gather', {
        from: start,
        facingSpace: true,
        loop: true,
        angle: a,
        scale: 0.65,
      });
      add('review_sword', 'travel', at, at + 430, 'seven_sword_strike', {
        facingSpace: true,
        from: start,
        to: [175, -24],
        loop: true,
        scale: 0.8,
      });
      add('review_sword', 'impact', at + 430, at + 710, 'star_impact', {
        facingSpace: true,
        from: [175, -24],
        scale: 0.7,
        fade: true,
      });
    }
  } else if (id === 'van_kiem_quy_tong') {
    p.duration = 6200;
    p.note =
      'Tụ kiếm → 5 GIÂY bắn liên tục tám hướng → tan kiếm. Nhịp 5s là đề xuất preview, chưa đổi thời lượng server.';
    body('van_kiem_quy_tong_character', 'cast', 0, 360);
    add('van_kiem_quy_tong_vfx', 'preparation', 0, 500, 'sword_gather', {
      scale: 2,
    });
    for (let at = 500; at < 5500; at += 400)
      radial('review_sword', 'travel', at, 8, 245, 0.7);
    add('review_sword', 'impact', 5500, 6000, 'sword_dissolve', {
      alpha: 0.65,
      scale: 1.6,
      fade: true,
    });
  } else if (id === 'toa_sat_bac_do') {
    const counter = reviewCounter(branch, 6000),
      end = counter.releaseAt;
    p.duration = end + 1300;
    p.note =
      'Thủ tối đa 5s · giảm 70% · cộng sát thương THỰC NHẬN · ngưỡng >20% HP tối đa · phản lại đúng lượng đã cộng. Số liệu mô phỏng.';
    body('toa_sat_bac_do_character', 'cast', 0, 320);
    body('toa_sat_bac_do_character', 'ready', 320, end, { loop: true });
    add(
      'vo_dang_shield_formation_v2_aura',
      'mana_loop',
      100,
      end,
      'guard_70_percent',
      { loop: true, alpha: 0.5 },
    );
    add('toa_sat_bac_do_vfx', 'readiness', 320, end, 'sheathed_readiness', {
      loop: true,
      scale: 2,
    });
    for (const h of counter.hits)
      add(
        'toa_sat_bac_do_vfx',
        'received',
        h.at,
        h.at + 300,
        'received_damage',
        { scale: 2 },
      );
    body('toa_sat_bac_do_character', 'counter', end, end + 420);
    radial('review_sword', 'travel', end, 12, 200, 0.85);
    add('review_sword', 'impact', end, end + 500, 'counter_release', {
      scale: 1.8,
      fade: true,
    });
  } else if (id === 'dai_luc_kim_cuong_chuong') {
    p.hero = 'hero_thieu_lam';
    p.duration = 2100;
    p.note =
      'Vận lực → đẩy chưởng → BÀN TAY vàng bay thẳng → chưởng ấn va chạm. Không mô phỏng damage/Phát Động.';
    body(
      'thieu_lam_hands_combo_v2_character',
      'dai_luc_kim_cuong_chuong_normal',
      0,
      500,
    );
    add('review_palm', 'travel', 300, 1050, 'golden_palm_travel', {
      facingSpace: true,
      from: [28, 0],
      to: [200, 0],
      elevation: 26,
      loop: true,
    });
    add('review_palm', 'impact', 1050, 1550, 'golden_palm_impact', {
      facingSpace: true,
      from: [200, 0],
      elevation: 26,
      fade: true,
    });
  } else if (id === 'tam_gioi_quy_thien') {
    p.hero = 'hero_thieu_lam_dao';
    p.duration = 2700;
    p.note =
      'Ba tầng pháp ấn lần lượt sáng → chém đao vàng → ấn phá giáp trên mục tiêu. Đề xuất nhịp hình ảnh.';
    body('tam_gioi_quy_thien_character', 'cast', 0, 650);
    for (let i = 0; i < 3; i++)
      add('bat_dong_minh_vuong_vfx', 'loop', i * 180, 1100, 'three_seals', {
        loop: true,
        ground: true,
        scale: 1.4 + i * 0.65,
        alpha: 0.5,
        from: [0, -i * 10],
      });
    add('tam_gioi_quy_thien_vfx', 'slash', 550, 1150, 'three_realms_slash', {
      scale: 3,
    });
    add('tam_gioi_quy_thien_vfx', 'impact', 850, 1450, 'armor_hit', {
      facingSpace: true,
      from: [140, -20],
      scale: 2.6,
    });
    add(
      'tam_gioi_quy_thien_vfx',
      'armor_break',
      1050,
      2150,
      'armor_break_seal',
      { facingSpace: true, from: [140, 0], loop: true, scale: 2 },
    );
  } else if (id === 'thieu_lam_dao') {
    p.hero = 'hero_thieu_lam_dao';
    p.duration = 3000;
    p.note =
      'Ba đòn preview: vệt đao xuất hiện ở contact, recovery gọn; server cooldown / tốc đánh giữ nguyên.';
    for (let at = 0; at < 2300; at += 770) {
      body('thieu_lam_dao_v2_character', 'basic', at, at + 400);
      add(
        'thieu_lam_dao_v2_aura',
        'basic_release',
        at + 65,
        at + 145,
        'anticipation_release',
      );
      add(
        'thieu_lam_dao_v2_aura',
        'basic_contact',
        at + 145,
        at + 245,
        'blade_contact',
        { scale: 1.15 },
      );
      add(
        'thieu_lam_dao_v2_aura',
        'basic_ending',
        at + 245,
        at + 365,
        'short_recovery',
        { fade: true },
      );
    }
  } else if (id === 'bat_dong_minh_vuong') {
    p.hero = 'hero_thieu_lam_dao';
    p.duration = 5100;
    p.note =
      'Khai pháp ấn → hào quang vàng duy trì dễ đọc → thu ấn. Thời lượng preview 4s, không thêm buff hay đổi pulse hồi máu.';
    body('bat_dong_minh_vuong_character', 'cast', 0, 440);
    add('bat_dong_minh_vuong_vfx', 'activation', 0, 450, 'minh_vuong_open', {
      scale: 2.6,
      ground: true,
    });
    add('bat_dong_minh_vuong_vfx', 'healing_pulse', 350, 900, 'healing_pulse', {
      scale: 2.2,
    });
    add('bat_dong_minh_vuong_vfx', 'loop', 600, 4200, 'minh_vuong_sustain', {
      loop: true,
      scale: 2.2,
      ground: true,
      alpha: 0.8,
    });
    add('bat_dong_minh_vuong_vfx', 'ending', 4200, 4800, 'minh_vuong_close', {
      scale: 2.2,
      fade: true,
      ground: true,
    });
  } else if (id === 'nhu_lai_thien_diep') {
    p.hero = 'hero_thieu_lam_dao';
    p.duration = 3500;
    p.note =
      'Các lớp chưởng ảnh nối tiếp bay trước mặt → cao trào chưởng ấn → dư ảnh tan. Nhịp preview 2.4s.';
    body('nhu_lai_thien_diep_character', 'cast', 0, 440);
    for (let i = 0; i < 7; i++) {
      const at = 300 + i * 240,
        across = ((i % 3) - 1) * 26;
      add('review_palm', 'travel', at, at + 650, 'thousand_leaf_palm', {
        facingSpace: true,
        from: [30, across],
        to: [200, across],
        elevation: 24,
        angle: ((i % 3) - 1) * 0.08,
        scale: 0.65 + i * 0.04,
        loop: true,
        alpha: 0.8,
      });
    }
    add('review_palm', 'impact', 2400, 3000, 'thousand_leaf_climax', {
      facingSpace: true,
      from: [200, 0],
      elevation: 24,
      scale: 1.25,
      fade: true,
    });
  } else if (id === 'luc_duong_chuong') {
    p.hero = 'hero_thien_son';
    p.duration = 3300;
    p.reference = true;
    p.note =
      'Đối chiếu hình ảnh hiện có: xoay chưởng + lớp bảo hộ. Cơ chế giữ nguyên.';
    body(wind + '_character', 'luc_duong_chuong_cast', 0, 280);
    body(wind + '_character', 'luc_duong_chuong_spin', 280, 2700, {
      loop: true,
    });
    add(wind + '_aura', 'guard_loop', 280, 2700, 'retained_spin', {
      loop: true,
    });
    add(wind + '_aura', 'guard_ending', 2700, 3050, 'retained_ending');
  } else {
    p.hero = 'hero_thien_son';
    p.duration = 3600;
    p.reference = true;
    p.note =
      'Đối chiếu hình ảnh hiện có: bão phiến + các đợt quạt tám hướng. Cơ chế giữ nguyên.';
    body(fan + '_character', 'bach_phien_phong_bao_cast', 0, 280);
    body(fan + '_character', 'bach_phien_phong_bao_whirl', 280, 2800, {
      loop: true,
    });
    add(fan + '_aura', 'storm_loop', 280, 2800, 'retained_storm', {
      loop: true,
    });
    for (let at = 400; at < 2600; at += 600)
      radial(fan + '_projectile', 'storm_fan_right', at, 8, 170, 0.7);
    add(fan + '_aura', 'storm_ending', 2800, 3200, 'retained_ending');
  }
  return p;
}
