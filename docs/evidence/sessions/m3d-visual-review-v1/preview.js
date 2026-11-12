const zones = [
  ['forest', 'Rừng Trúc'],
  ['desert', 'Sa Mạc'],
  ['sea', 'Biển'],
  ['hell', 'Địa Ngục'],
  ['arena', 'HUD'],
];
const entries = [
  ['forest', 'venom', 'Trúc Xà · Phun độc', 'Thân Trúc Xà dùng cùng atlas Motion v08 từ lúc chuẩn bị đến lúc phun. Xem miệng rắn, đường độc bay và điểm chạm.', 'Sprite và VFX hiện có', 1800],
  ['forest', 'web', 'Độc Chu · Tơ nhện', 'Tơ là đòn đánh thường. Sợi tơ bay thẳng, bung lưới khi chạm, gây sát thương và định thân. Vệt lưới dưới chân biểu thị thời gian bị giữ.', 'Tơ và thân hiện có · cách hiển thị định thân mới', 2050],
  ['forest', 'rock', 'Sơn Viên · Ném đá', 'Sơn Viên nhấc đá, ném theo cung và làm bụi đá vỡ tại điểm rơi. Bản mẫu ghép tư thế giơ tay Motion v08 với hòn đá riêng.', 'Thân và bụi hiện có · hòn đá ứng viên', 2050],
  ['forest', 'roots', 'Mộc Linh · Rễ trồi', 'Rễ bật nối tiếp dọc đường chiêu, sát mặt đất và đúng hướng Mộc Linh đang đánh.', 'Ghép lại atlas rễ hiện có', 1760],
  ['forest', 'darts', 'Ám khí bốn phía', 'Phi tiêu bay thẳng từ bốn mép, phóng lệch nhịp. Projectile là dấu hiệu đầu tiên. Tia chạm và nhãn choáng minh họa một lần trúng.', 'VFX ứng viên', 3500],
  ['desert', 'curse', 'Xác Ướp · Cát nguyền', 'Cát quét thành hình quạt trước mặt, kèm dấu tím ngắn để phân biệt với cú cào thường.', 'Motion v08 · VFX ứng viên', 1720],
  ['desert', 'sandstone', 'Cự Nhân · Sa thạch bộc phá', 'Khe nứt chạy dọc đường chiêu, đá bật lên rồi rơi vụn ngay trên đường đó.', 'Motion v08 · VFX ứng viên', 1880],
  ['desert', 'quicksand', 'Cát lún cố định', 'Vân cát xoáy đánh dấu vùng cố định. Nhân vật đi chậm và bị khóa lướt trong vùng, rồi bước ra ở mép bên kia.', 'VFX ứng viên', 3400],
  ['sea', 'pincers', 'Cua · Song càng', 'Hai nhịp kẹp tách rõ, mỗi nhịp có một hiệu ứng chạm ngắn, dịch nhẹ qua hai bên của mục tiêu.', 'Thân và VFX càng hiện có', 1640],
  ['sea', 'cannon', 'Hải Tặc · Pháo kích', 'Chớp đầu nòng, đạn pháo bay theo cung rồi nổ ở đúng điểm rơi.', 'Thân và VFX pháo hiện có', 2050],
  ['sea', 'tide', 'Hải Vu · Triều dâng', 'Đầu sóng bọt trắng chạy ngang nền, cao dần rồi đổ khi kết thúc. Vệt sóng phân biệt với thủy đạn.', 'Motion v08 · VFX ứng viên', 2050],
  ['sea', 'geyser', 'Bẫy nước', 'Gợn nước co lại tại vị trí đã chốt, rồi cột nước bắn thẳng lên gây choáng. Mẫu minh họa một lần nổ.', 'VFX ứng viên · nhịp báo thử', 2200],
  ['hell', 'claw', 'Xích Quỷ · Hỏa trảo', 'Ba vệt móng đỏ cam bám theo cú vung rồi tách thành tàn lửa khi thu tay.', 'Motion v08 · VFX ứng viên', 1650],
  ['hell', 'firetrap', 'Bẫy lửa theo nhịp', 'Ba khe cố định sáng dần và phun lệch nhịp. Trúng cột lửa gây choáng. Đọc khe nào sắp phun để chọn đường đi giữa các cột lửa.', 'VFX ứng viên · nhịp báo thử', 3350],
  ['arena', 'hud', 'Giữ O + QWERT', 'Mẫu chỉ dẫn trong viewport và phản hồi khi tăng một bậc ở ô Q. Có thể giữ O rồi bấm Q để xem trạng thái xác nhận.', 'Mẫu HUD tương tác', 2350],
].map(([zone, id, title, summary, source, duration]) => ({zone, id, title, summary, source, duration}));

const $ = (id) => document.getElementById(id);
const selection = new URLSearchParams(location.search).get('case');
let current = entries.find((entry) => entry.id === selection) ?? entries[0];
let time = 0, playing = true, rate = 1, scene, hudOverride = false, heldO = false;
const numberFormat = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const clips = REVIEW_ASSETS.clips;
const seen = new Set();

function button(text, pressed, onClick) {
  const result = document.createElement('button');
  result.type = 'button';
  result.textContent = text;
  result.setAttribute('aria-pressed', pressed);
  result.onclick = onClick;
  return result;
}

function select(entry) {
  current = entry;
  time = 0;
  playing = true;
  hudOverride = false;
  $('play').textContent = 'Tạm dừng';
  $('zones').replaceChildren(...zones.map(([id, label]) =>
    button(label, id === current.zone, () => select(entries.find((value) => value.zone === id))),
  ));
  $('cases').replaceChildren(...entries.filter((value) => value.zone === current.zone).map((value) =>
    button(value.title, value.id === current.id, () => select(value)),
  ));
  $('title').textContent = current.title;
  $('summary').textContent = current.summary;
  $('source').textContent = current.source;
  $('hud').hidden = current.id !== 'hud';
  if (scene) scene.renderAt(0);
}

const inRange = (t, from, until) => t >= from && t < until;
const progress = (t, from, until) => Math.min(1, Math.max(0, (t - from) / (until - from)));
const between = (start, end, amount) => start + (end - start) * amount;

class ReviewScene extends Phaser.Scene {
  create() {
    const image = new Image();
    image.onload = () => {
      this.textures.addAtlas('review', image, REVIEW_ASSETS.atlas);
      this.pool = [];
      this.status = this.add.text(0, 0, '', {
        fontFamily: 'Segoe UI, sans-serif', fontStyle: 'bold', fontSize: '16px',
        color: '#fff0ca', stroke: '#20191a', strokeThickness: 4,
      }).setOrigin(0.5, 1).setDepth(30);
      this.backdrop = this.add.image(0, 0, 'review', 'ground/forest').setOrigin(0).setDepth(-10);
      scene = this;
      this.renderAt(0);
    };
    image.onerror = () => { $('phase').textContent = 'Không mở được atlas preview'; };
    image.src = REVIEW_ASSETS.image;
  }

  update(_, delta) {
    if (!this.backdrop || !playing) return;
    time = (time + Math.min(delta, 64) * rate) % current.duration;
    this.renderAt(time);
  }

  cel(frame, x, y, options = {}) {
    if (!this.textures.get('review').has(frame)) throw new Error('Missing Phaser frame ' + frame);
    const index = this.used++;
    const sprite = this.pool[index] ?? (this.pool[index] = this.add.image(0, 0, 'review', frame));
    const [originX, originY] = REVIEW_ASSETS.anchors[frame];
    sprite.setVisible(true).setFrame(frame).setOrigin(originX, originY)
      .setPosition(Math.round(x), Math.round(y))
      .setScale(options.scale ?? 1)
      .setRotation(options.rotation ?? 0)
      .setAlpha(options.alpha ?? 1)
      .setDepth(options.depth ?? 2);
    if (options.tint === undefined) sprite.clearTint();
    else sprite.setTint(options.tint);
    seen.add(current.id + ':' + frame);
  }

  frame(clip, index, x, y, options) {
    const sequence = clips[clip];
    const i = Math.min(sequence.length - 1, Math.max(0, index));
    this.cel(sequence[i][0], x, y, options);
  }

  animate(clip, t, start, end, x, y, options) {
    if (!inRange(t, start, end)) return;
    const sequence = clips[clip];
    const duration = sequence.reduce((sum, frame) => sum + frame[1], 0);
    let elapsed = progress(t, start, end) * duration;
    for (let index = 0; index < sequence.length; index++) {
      elapsed -= sequence[index][1];
      if (elapsed < 0 || index === sequence.length - 1) {
        this.frame(clip, index, x, y, options);
        return;
      }
    }
  }

  actor(name, t, start, end, x = 225, y = 266) {
    if (inRange(t, start, end)) this.animate(name + '.basic_attack', t, start, end, x, y, { depth: 5 });
    else this.frame(name + '.idle', Math.floor(t / 340) % 2, x, y, { depth: 5 });
  }

  target(x, y, walking, t, hit = false) {
    this.frame(walking ? 'hero.walk.right' : 'hero.idle.left',
      walking ? Math.floor(t / 105) % 4 : 0,
      x, y, { depth: 6, tint: hit ? 0xffbd98 : undefined });
  }

  message(label, x, y) {
    this.status.setVisible(true).setText(label).setPosition(x, y);
  }

  renderAt(t) {
    this.used = 0;
    this.status.setVisible(false);
    this.backdrop.setFrame('ground/' + current.zone);
    let phase = 'Chuẩn bị';
    const x = 225, y = 266, targetX = 594, targetY = 266;
    const hit = (from, until = from + 165) => inRange(t, from, until);
    const scenePhase = (release, land, after = 'Thu chiêu') =>
      t < release ? 'Chuẩn bị' : t < land ? 'Tung chiêu' : t < land + 325 ? 'Va chạm' : after;

    switch (current.id) {
      case 'venom': {
        this.actor('forest_truc_xa', t, 260, 810);
        this.target(targetX, y, false, t, hit(1090));
        this.animate('truc_xa_venom_release', t, 520, 740, 262, 236);
        const p = progress(t, 620, 1090);
        if (inRange(t, 620, 1090)) this.frame('truc_xa_venom_projectile_right', Math.floor(t / 74) % 4, between(277, targetX, p), 238, {scale: 0.7});
        this.animate('truc_xa_venom_impact', t, 1090, 1470, targetX, y - 24);
        phase = scenePhase(620, 1090);
        break;
      }
      case 'web': {
        this.actor('forest_doc_chu', t, 265, 765);
        const p = progress(t, 560, 1050);
        this.target(targetX, y, false, t, hit(1050));
        if (inRange(t, 560, 1050)) this.frame('doc_chu_web_projectile_right', Math.floor(t / 74) % 4, between(270, targetX, p), y - 20, {scale: 0.77});
        this.animate('doc_chu_web_impact', t, 1050, 1360, targetX, y - 22);
        if (inRange(t, 1125, 1780)) {
          this.frame('doc_chu_web_impact', 2, targetX, y - 3, { scale: 0.82, depth: 8, alpha: 0.82 });
          this.message('Định thân', targetX, y - 100);
        }
        phase = t < 560 ? 'Đánh thường' : t < 1050 ? 'Tơ bay' : t < 1780 ? 'Trúng · định thân' : 'Thoát định thân';
        break;
      }
      case 'rock': {
        if (inRange(t, 250, 900)) {
          const attackFrame = t < 420 ? 0 : t < 695 ? 1 : t < 790 ? 2 : 3;
          this.frame('forest_son_vien.basic_attack', attackFrame, x, y, {depth: 5});
        } else {
          this.actor('forest_son_vien', t, 0, 0);
        }
        this.target(targetX, y, false, t, hit(1190));
        this.animate('son_vien_windup_dust', t, 250, 600, x, y - 6, {depth: 3});
        if (inRange(t, 420, 695)) this.frame('rock', 0, 220, 192, {depth: 7});
        if (inRange(t, 695, 1190)) {
          const p = progress(t, 695, 1190);
          this.frame('rock', 0, between(239, targetX, p), between(194, targetY - 10, p) - 96 * 4 * p * (1 - p),
            {scale: 1.14, rotation: p * 3.2, depth: 9});
        }
        this.animate('son_vien_slam_impact', t, 1190, 1630, targetX, y - 2, {scale: 1.18, depth: 8});
        this.animate('son_vien_pebble_scatter', t, 1265, 1690, targetX, y - 3, {scale: 1.25, depth: 9});
        phase = t < 420 ? 'Lấy đà' : t < 695 ? 'Nhấc đá' : t < 1190 ? 'Đá bay' : t < 1690 ? 'Đá vỡ tại điểm rơi' : 'Thu chiêu';
        break;
      }
      case 'roots': {
        this.actor('forest_moc_linh', t, 265, 800);
        this.target(targetX, y, false, t, hit(1025));
        for (let i = 0; i < 6; i++) {
          const start = 615 + i * 83;
          this.animate('moc_linh_root_emerge', t, start, start + 410, 276 + 62 * i, y - 12, {scale: 0.89, depth: i === 5 ? 8 : 4});
        }
        phase = t < 615 ? 'Tụ lực' : t < 1400 ? 'Rễ bật nối tiếp' : 'Rễ rút';
        break;
      }
      case 'darts': {
        this.target(412, 253, false, t, hit(1240));
        const paths = [
          [430, 1240, -32, 232, 412, 232],
          [950, 1810, 856, 166, -32, 166],
          [1480, 2210, 515, -25, 515, 468],
          [2180, 3050, 344, 480, 344, -25],
        ];
        for (const [start, end, x0, y0, x1, y1] of paths) {
          if (!inRange(t, start, end)) continue;
          const p = progress(t, start, end);
          this.frame('dart', Math.floor(t / 88) % 2, between(x0, x1, p), between(y0, y1, p), {rotation: Math.atan2(y1 - y0, x1 - x0), depth: 8});
        }
        if (inRange(t, 1240, 1480)) this.frame('dart', t < 1355 ? 2 : 3, 412, 230, {scale: 1.35, depth: 9});
        if (inRange(t, 1240, 1660)) this.message('Choáng', 412, 156);
        phase = t < 430 ? 'Đường trống' : t < 1240 ? 'Phi tiêu từ mép rừng' : t < 1660 ? 'Trúng · choáng' : 'Phi tiêu lệch nhịp';
        break;
      }
      case 'curse': {
        this.actor('desert_xac_uop', t, 245, 810, 305, y);
        this.target(472, y, false, t, hit(720));
        this.animate('curse', t, 480, 1140, 408, y - 26, {depth: 8, scale: 1.18});
        phase = scenePhase(480, 720);
        break;
      }
      case 'sandstone': {
        this.actor('desert_cu_nhan_sa_thach', t, 230, 800);
        this.target(targetX, y, false, t, hit(1050));
        for (let i = 0; i < 3; i++) {
          const start = 520 + i * 165;
          this.animate('sandstone', t, start, start + 650, 320 + i * 131, y, {depth: i === 2 ? 7 : 4, scale: 1.05});
        }
        phase = t < 520 ? 'Dồn lực' : t < 1480 ? 'Nứt đất · đá bật lên' : 'Đá vụn rơi';
        break;
      }
      case 'quicksand': {
        this.frame('quicksand', Math.floor(t / 165) % 4, 418, 267, {depth: 1, scale: 1.18});
        const inner = inRange(t, 950, 2460);
        const px = t < 950 ? between(212, 329, progress(t, 400, 950)) :
          t < 2460 ? between(329, 505, progress(t, 950, 2460)) :
          between(505, 637, progress(t, 2460, 3080));
        this.target(px, 263, inRange(t, 400, 3080), inner ? t * 0.72 : t);
        if (inner) this.message('Chậm · khóa lướt', px, 169);
        phase = t < 950 ? 'Rìa cát thấy từ xa' : inner ? 'Đi bộ trong cát lún' : 'Ra khỏi vùng';
        break;
      }
      case 'pincers': {
        this.actor('beach_cua_khong_lo', t, t < 735 ? 240 : 735, t < 735 ? 705 : 1165, 315, y);
        this.target(451, y, false, t, hit(580, 690) || hit(960, 1070));
        this.animate('pincer_impact', t, 580, 810, 433, y - 21, {depth: 8, scale: 0.95});
        this.animate('pincer_impact', t, 960, 1190, 455, y - 29, {depth: 8, scale: 0.95});
        phase = t < 580 ? 'Giơ càng' : t < 960 ? 'Kẹp thứ nhất' : t < 1190 ? 'Kẹp thứ hai' : 'Thu càng';
        break;
      }
      case 'cannon': {
        this.actor('beach_hai_tac_hoa_phao', t, 235, 840);
        this.target(targetX, y, false, t, hit(1250));
        this.animate('muzzle_flash', t, 565, 820, 280, 228, {depth: 7});
        if (inRange(t, 650, 1250)) {
          const p = progress(t, 650, 1250);
          this.frame('cannon_projectile', Math.floor(t / 80) % 4, between(285, targetX, p), between(228, y - 5, p) - 76 * 4 * p * (1 - p), {depth: 8});
        }
        this.animate('cannon_impact', t, 1250, 1740, targetX, y - 17, {scale: 1.17, depth: 8});
        phase = t < 565 ? 'Lấy đà' : t < 650 ? 'Khai hỏa' : t < 1250 ? 'Đạn bay' : t < 1740 ? 'Nổ tại điểm rơi' : 'Khói tan';
        break;
      }
      case 'tide': {
        this.actor('beach_hai_vu', t, 240, 795);
        this.target(targetX, y, false, t, hit(1300));
        const p = progress(t, 560, 1570);
        if (inRange(t, 560, 1570)) this.frame('tide', Math.min(3, Math.floor(p * 4)), between(270, 707, p), y + 1, {depth: 8, scale: 1.1});
        this.animate('water_splash', t, 1300, 1640, targetX, y - 13, {depth: 9, scale: 0.72});
        phase = t < 560 ? 'Tụ nước' : t < 1300 ? 'Đầu sóng lan ngang' : t < 1640 ? 'Sóng đánh qua mục tiêu' : 'Sóng tan';
        break;
      }
      case 'geyser': {
        const start = 400, burst = 1030, end = 1600, gx = 460, gy = 274;
        this.target(gx + 7, gy - 4, false, t, hit(burst));
        if (inRange(t, start, end)) {
          const frame = t < 720 ? 0 : t < burst ? 1 : t < 1260 ? 2 : 3;
          this.frame('geyser', frame, gx, gy, {depth: frame < 2 ? 2 : 8, scale: 1.05});
        }
        if (inRange(t, burst, 1615)) this.message('Choáng', gx + 62, gy - 98);
        phase = t < start ? 'Mặt đất' : t < burst ? 'Gợn nước báo trước' : t < end ? 'Cột nước · choáng' : 'Nước rút';
        break;
      }
      case 'claw': {
        this.actor('hell_xich_quy', t, 240, 900, 321, y);
        this.target(465, y, false, t, hit(775));
        this.animate('claw', t, 510, 1110, 421, y - 29, {scale: 1.12, depth: 8});
        phase = t < 510 ? 'Giương móng' : t < 775 ? 'Vung móng' : t < 1110 ? 'Hỏa trảo chạm mục tiêu' : 'Tàn lửa';
        break;
      }
      case 'firetrap': {
        const vents = [[232, 271, 420], [411, 202, 1050], [602, 270, 1680]];
        const stunned = inRange(t, 1030, 1510);
        const px = t < 1510
          ? between(145, 233, progress(t, 260, 1030))
          : between(233, 672, progress(t, 1510, 3100));
        const py = between(274, 355, progress(t, 1510, 2020));
        this.target(px, py, !stunned && inRange(t, 260, 3100), t, hit(1030));
        if (stunned) this.message('Choáng', px + 53, py - 103);
        for (const [vx, vy, start] of vents) {
          const f = t < start || t >= start + 1140 ? 0 : t < start + 610 ? 1 : t < start + 865 ? 2 : 3;
          this.frame('firetrap', f, vx, vy, {depth: f < 2 ? 2 : 8, scale: 0.97, alpha: f === 0 ? 0.66 : 1});
        }
        phase = t < 420 ? 'Khe cố định' : stunned ? 'Cột lửa · choáng' : t < 2830 ? 'Khe sáng · cột lửa phun lệch nhịp' : 'Khe nguội';
        break;
      }
      case 'hud': {
        this.frame('hero.idle.down', 0, 420, 267, {depth: 5});
        const upgraded = hudOverride || t >= 1480;
        $('rank').textContent = upgraded ? 'Bậc 2' : 'Bậc 1';
        $('rank').parentElement.classList.toggle('active', upgraded || heldO);
        $('hint').textContent = upgraded ? 'Q · Đã học bậc 2' : 'Giữ O + Q/W/E/R/T để học chiêu';
        phase = upgraded ? 'Phản hồi nâng bậc' : 'Có điểm kỹ năng';
        break;
      }
      default: throw new Error('Unknown review case ' + current.id);
    }

    for (let index = this.used; index < this.pool.length; index++) this.pool[index].setVisible(false);
    $('phase').textContent = phase;
    $('seek').value = String(Math.round(1000 * t / current.duration));
    $('clock').textContent = numberFormat.format(t / 1000) + ' s';
  }
}

$('play').onclick = () => {
  playing = !playing;
  $('play').textContent = playing ? 'Tạm dừng' : 'Phát tiếp';
};
$('replay').onclick = () => select(current);
$('speed').onclick = () => {
  rate = rate === 1 ? 0.5 : 1;
  $('speed').setAttribute('aria-pressed', rate === 0.5);
  $('speed').textContent = rate === 0.5 ? '1×' : '0,5×';
};
$('seek').oninput = (event) => {
  playing = false;
  $('play').textContent = 'Phát tiếp';
  time = current.duration * Number(event.target.value) / 1000;
  scene?.renderAt(time);
};
window.addEventListener('keydown', (event) => {
  if (current.id !== 'hud' || event.repeat) return;
  if (event.code === 'KeyO') heldO = true;
  if (heldO && event.code === 'KeyQ') {
    event.preventDefault();
    hudOverride = true;
    scene?.renderAt(time);
  }
});
window.addEventListener('keyup', (event) => { if (event.code === 'KeyO') heldO = false; });
window.addEventListener('blur', () => { heldO = false; });
select(current);

new Phaser.Game({
  type: Phaser.WEBGL, width: 824, height: 448, parent: 'world',
  pixelArt: true, backgroundColor: '#263225', scene: ReviewScene,
});

window.review = {
  cases: entries.map(({id, duration}) => ({id, duration})),
  ready: () => Boolean(scene?.backdrop),
  seek: (id, milliseconds) => {
    const entry = entries.find((value) => value.id === id);
    if (!entry || !scene) throw new Error('Preview case not available');
    if (current.id !== id) select(entry);
    playing = false;
    $('play').textContent = 'Phát tiếp';
    time = milliseconds;
    scene.renderAt(time);
    return [...scene.pool].filter((sprite) => sprite.visible).map((sprite) => sprite.frame.name);
  },
  seen: () => [...seen],
};
