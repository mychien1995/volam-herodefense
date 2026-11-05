import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { m1Config } from '@volam/game-data';
const evidence = 'docs/evidence/renovation-v2',
  out = 'assets/exports/renovation-v2/review';
const report = JSON.parse(
  readFileSync(evidence + '/skill-comparison.json', 'utf8'),
);
if (report.status !== 'PASS')
  throw Error('Real Phaser skill checks must pass before building the review.');
mkdirSync(out, { recursive: true });
const notes = {
  that_tinh_kiem:
    'Bốn nhịp đánh theo dữ liệu hiện tại; mũi kiếm và vệt chém giữ điểm phát cũ.',
  nhan_kiem_hop_nhat:
    'Kiếm bay thẳng, xuyên mục tiêu. Tái kích hoạt Q để dịch chuyển đến kiếm; tay không khi kiếm đang bay.',
  bat_quai_kiem_tran:
    'Trận kiếm cố định trên đất, giữ nguyên tâm và bán kính sát thương.',
  toa_sat_bac_do:
    'Dựng kiếm thủ thế, nhận đòn rồi phản kích theo sát thương đã tích. Vòng thủ riêng, không đổi Thái Cực Quyền.',
  van_kiem_quy_tong:
    '13 nhịp phóng kiếm theo tám hướng; tâm phát bám đúng nhân vật.',
  lien_hoa_phien:
    'Hoa sen bảo hộ cố định trên đất. Rời vùng mất bảo hộ, quay lại nhận lại; không gây sát thương.',
  luc_duong_chuong:
    'Xoay quạt sáu nhịp trong khi di chuyển, giữ nguyên tâm đánh và nhịp phòng hộ.',
  luu_phong_bo:
    'Lướt thẳng theo hướng đang nhìn; vệt gió bám đúng đường lướt. Ảnh tĩnh chỉ là một thời điểm ngắn.',
  chiet_mai_thu:
    'Tư thế kết ấn hoa mai và aura tăng cường, bám đúng người thi triển.',
  bach_phien_phong_bao:
    'Xoay quạt 12 nhịp, mỗi ba nhịp phóng quạt tám hướng. Hiệu ứng và thân tách riêng.',
};
const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;');
const skills = Object.keys(notes);
for (const skill of skills)
  for (const suffix of ['old', 'new'])
    copyFileSync(
      `${evidence}/${skill}-${suffix}.png`,
      `${out}/${skill}-${suffix}.png`,
    );
const cards = skills
  .map(
    (id) =>
      `<article><h2>${esc(m1Config.skillCatalogue[id].nameVi)}</h2><p>${esc(notes[id])}</p><div class="pair"><figure><figcaption>Bản cũ</figcaption><img src="${id}-old.png" width="512" height="480"></figure><figure><figcaption>Bản thử mới</figcaption><img src="${id}-new.png" width="512" height="480"></figure></div></article>`,
  )
  .join('\n');
writeFileSync(
  out + '/index.html',
  `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Võ Đang Kiếm · Thiên Sơn Phiến — Renovation v2</title><style>body{margin:24px auto;padding:0 16px;max-width:1056px;background:#141b1d;color:#eee5cf;font:16px/1.5 system-ui}a{color:#9bdfed}h1{font-size:26px}h2{margin-bottom:4px}p{margin-top:4px}.pair{display:flex;flex-wrap:wrap;gap:16px}figure{margin:0}figcaption{margin-bottom:6px;color:#cdb98d}img{max-width:100%;height:auto}article{padding:12px 0 24px;border-bottom:1px solid #53605c}</style><h1>Võ Đang Kiếm · Thiên Sơn Phiến</h1><p>Bản thử để duyệt: thân và VFX mới, cùng điểm phát và dữ liệu chiến đấu. PNG từ hai client trong cùng trận Phaser, canvas 1366×768, camera 2×, không phóng ảnh sau khi chụp. Các ảnh được chụp đồng thời; một ảnh tĩnh không thể hiện đủ diễn tiến chiêu.</p><p><a href="http://127.0.0.1:5537/?debug=1&skillPreview=1">Chơi bản thử</a> · <a href="http://127.0.0.1:5537/?debug=1&skillPreview=1&renovationSkills=old">Chơi với skill cũ</a> · <a href="http://127.0.0.1:5536/">Game thường</a></p><p>Trong bản thử: chọn Võ Đang hoặc Thiên Sơn tại sảnh; chọn đòn Kiếm/Phiến; chọn skill → Equip Q → Cast Q. Dùng phím mũi tên đổi hướng, A đánh thường, Q dùng skill. Target line tạo mục tiêu, Attacking dummy dùng để thử Tọa Sát. Mana và hồi chiêu do server xử lý.</p><p>Phần này thay hành động của hai nhánh thử nghiệm. Hành động/skill của các nhánh còn lại và boss vẫn là nguồn cũ; không ghi nhận chúng là đã renovate.</p>${cards}</html>\n`,
);
console.log('Built 10 paired real-Phaser comparisons.');
