import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { m1Config } from '@volam/game-data';
const root = 'docs/evidence/renovation-v3/';
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;');
const pair = (id, name, description) =>
  `<section id="${id}"><h2>${escape(name)}</h2><p>${escape(description)}</p><div class="pair">${['old', 'new'].map((v) => `<figure><figcaption>${v === 'old' ? 'Bản cũ' : 'Đồ họa mới'}</figcaption><a href="${id}-${v}.png"><img loading="lazy" width="512" height="480" src="${id}-${v}.png" alt="${escape(name)} ${v}"></a></figure>`).join('')}</div></section>`;
const skills = Object.values(m1Config.progression.skills).filter((s) =>
  existsSync(root + s.id + '-new.png'),
);
const bodies = JSON.parse(
  readFileSync('apps/game-client/src/renovation-actions.generated.json'),
).bodies;
const bodyLinks = bodies
  .map(
    (b) =>
      `<li>${escape(b.actor)}: <a href="../../../${b.url.replace('/assets/', 'assets/exports/')}">PNG</a> · <a href="../../../${b.atlas.replace('/assets/', 'assets/exports/')}">JSON</a></li>`,
  )
  .join('');
const bosses = readdirSync(root).filter(
  (n) => n.startsWith('boss-') && n.endsWith('.png'),
);
const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Renovation v3 — duyệt kỹ năng</title><style>body{background:#192121;color:#efe6cc;font:16px system-ui;margin:24px auto;padding:0 20px;max-width:1060px}h1,h2{color:#f1ce82}p{max-width:850px;line-height:1.6}a{color:#bce2ed}section{padding:20px 0;border-top:1px solid #53615d}.pair{display:flex;flex-wrap:wrap;gap:12px}figure{margin:0}img{max-width:100%;height:auto}figcaption{margin:8px 0}.boss img{width:683px}li{line-height:1.7}</style><h1>Đồ họa kỹ năng — v3</h1><p>Ảnh chụp trực tiếp trong Phaser, camera gameplay 2× và canvas/CSS 1:1. Cột trái là đồ họa cũ, cột phải là ứng viên mới. Ảnh từng cặp chụp cùng lượt cast qua hai client; các đòn rất nhanh có thể lệch một nhịp do thời điểm chụp. Các fixture tạo điều kiện cast từ server; đây không phải bản quay chuyển động hay một lượt đánh boss tự nhiên.</p><p><a href="http://127.0.0.1:5547/?debug=1&skillPreview=1">Thử kỹ năng trực tiếp</a> · <a href="http://127.0.0.1:5546/">Vào game bình thường</a> · <a href="README.md">Báo cáo kiểm tra</a></p>${skills.map((s) => pair(s.id, s.ranks[0].nameVi, s.descriptionVi)).join('')}<h2>Boss — ảnh từ các pha thực thi thật</h2>${bosses.map((n) => `<section class="boss"><p>${escape(n.replace('boss-', '').replace('.png', ''))}</p><a href="${n}"><img loading="lazy" width="1366" height="768" src="${n}" alt="${escape(n)}"></a></section>`).join('')}<h2>PNG/JSON thân nhân vật</h2><p>Các chiêu chia sẻ pose phù hợp với vũ khí và trạng thái. Các frame gây sát thương và điểm phát hiệu ứng vẫn theo dữ liệu gốc. Hurt/death nằm ngoài đợt thay cast này.</p><ul>${bodyLinks}</ul></html>`;
writeFileSync(root + 'review.html', html);
console.log(
  `Review: ${skills.length} school pairs, ${bosses.length} boss captures, ${bodies.length} native body atlases`,
);
