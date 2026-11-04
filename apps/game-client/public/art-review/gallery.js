const $ = (s) => document.querySelector(s);
const names = {
  cai_bang: 'Cái Bang',
  thien_son: 'Thiên Sơn',
  vo_dang: 'Võ Đang',
  thieu_lam: 'Thiếu Lâm',
  ly_mac_sau: 'Lý Mạc Sầu',
  hong_liet: 'Hoàn Nhan Hồng Liệt',
  chu_ba_thong: 'Chu Bá Thông',
  kim_luan_phap_vuong: 'Kim Luân Pháp Vương',
  dong_ta: 'Đông Tà',
  tay_doc: 'Tây Độc',
  nam_de: 'Nam Đế',
  bac_cai: 'Bắc Cái',
  hoang_dung: 'Hoàng Dung',
  mai_sieu_phong: 'Mai Siêu Phong',
  hoac_do: 'Hoắc Đô',
  dat_nhi_ba: 'Đạt Nhĩ Ba',
};
const groupName = (g) =>
  g
    .split(':')
    .map((x) => names[x] ?? x)
    .join(' · ');
const displayName = (c) =>
  !c.skill && c.kind === 'hero'
    ? 'Đánh thường · ' + groupName(c.group)
    : c.name;
const fold = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('đ', 'd')
    .replaceAll('Đ', 'D')
    .toLowerCase();
let cases = [],
  selected,
  kind = '',
  ready = false,
  paused = false,
  busy = false,
  pending,
  loopTimer;
const repeatDelay = (c) =>
  c?.skill === 'nhu_lai_thien_diep'
    ? 17500
    : c?.kind === 'hero'
      ? 12000
      : 30000;
const engine = () => $('#engine').contentWindow;
const client = () => engine().__VOLAM__;
const review = () => engine().__RUNTIME_ART_REVIEW__;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(test, timeout = 45000) {
  const until = performance.now() + timeout;
  while (!test()) {
    if (performance.now() > until)
      throw Error('Preview tải quá lâu. Hãy tải lại trang.');
    await sleep(80);
  }
}
function status(text, error = false) {
  $('#status').textContent = text;
  $('#status').classList.toggle('error', error);
}
function renderList() {
  const search = fold($('#search').value),
    group = $('#group').value;
  const visible = cases.filter(
    (c) =>
      (!kind || c.kind === kind) &&
      (!group || c.group === group) &&
      fold(displayName(c) + ' ' + groupName(c.group) + ' ' + c.id).includes(
        search,
      ),
  );
  $('#count').textContent = `${visible.length} / ${cases.length} đòn`;
  $('#cases').replaceChildren();
  for (const c of visible) {
    const b = document.createElement('button');
    b.dataset.case = c.id;
    b.setAttribute('aria-current', String(selected?.id === c.id));
    b.append(document.createTextNode(displayName(c)));
    const sub = document.createElement('small');
    sub.textContent = groupName(c.group);
    b.append(sub);
    b.onclick = () => {
      void choose(c);
    };
    $('#cases').append(b);
  }
  if (!visible.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Không tìm thấy kỹ năng.';
    $('#cases').append(p);
  }
}
async function operation(c, op) {
  const s = client().snapshot();
  const r = await fetch(
    '/__visual_review?' +
      new URLSearchParams({
        room: s.roomId,
        player: s.sessionId,
        case: c.id,
        op,
      }),
    { method: 'POST' },
  );
  if (!r.ok) throw Error(await r.text());
  return r.json();
}
function setPaused(value) {
  paused = value;
  review().setPaused(value);
  $('#pause').textContent = value ? 'Tiếp tục' : 'Dừng hình';
  status(
    value ? 'Đã dừng cùng một frame ở hai bên.' : 'Đang phát · tốc độ gốc',
  );
}
const basicStages = {
  cai_bang_bong: ['thrust', 'sweep', 'lift', 'smash'],
  thieu_lam_quyen: ['left_fist', 'right_fist', 'front_kick', 'roundhouse_kick'],
};
const localHero = (s) => s.state.players[s.sessionId];
async function cast(abilityId, active, slot = 0) {
  const s = client().snapshot();
  const last = Math.max(0, ...s.events.map((e) => e.id));
  client().galleryCast(active, slot);
  let event;
  await waitFor(() => {
    event = client()
      .snapshot()
      .events.find(
        (e) =>
          e.id > last &&
          e.sourceId === s.sessionId &&
          e.abilityId === abilityId &&
          e.kind === (active ? 'cast' : 'attack'),
      );
    return event;
  }, 7000);
  return event;
}
async function playHero(c) {
  if (c.skill === 'vo_anh_cuoc' && $('#proc').checked) {
    await cast('toan_phong_thoai', true, 1);
    await waitFor(
      () =>
        JSON.parse(localHero(client().snapshot()).combos || '[]').some(
          (step) => step.id === 'phat_dong_b' && step.step === 1,
        ),
      3000,
    );
    if (pending) return;
    await cast('hoanh_tao_cuoc', true, 2);
  }
  const stages = !c.skill && basicStages[c.basic];
  const first = await cast(c.skill ?? c.basic, !!c.skill);
  if (!stages) return;
  let event = first;
  for (const [i, stage] of stages.entries()) {
    if (pending) return;
    if (i > 0) {
      await waitFor(
        () => pending || localHero(client().snapshot())?.basicCooldown === 0,
        4500,
      );
      if (pending) return;
      event = await cast(c.basic, false);
    }
    if (event.stage !== stage)
      throw Error('Thức đánh từ server: ' + event.stage);
    status(`Thức ${i + 1}/${stages.length} · tốc độ gốc`);
  }
}
async function choose(c) {
  if (c.id !== selected?.id) $('#proc').checked = false;
  selected = c;
  pending = c;
  $('#name').textContent = displayName(c);
  $('#school').textContent = groupName(c.group);
  $('#description').textContent = c.description;
  $('#proc-control').hidden = c.skill !== 'vo_anh_cuoc';
  history.replaceState(null, '', '#' + encodeURIComponent(c.id));
  renderList();
  clearTimeout(loopTimer);
  if (!ready || busy) return;
  while (pending) {
    const next = pending;
    pending = undefined;
    busy = true;
    $('#replay').disabled = true;
    $('#pause').disabled = true;
    $('#loading').hidden = false;
    $('#loading').textContent = 'Đang chuẩn bị ' + displayName(next) + '…';
    try {
      setPaused(false);
      await operation(next, 'prepare');
      await sleep(300);
      if (pending) continue;
      client().galleryClearEffects();
      if (next.kind === 'hero') {
        $('#loading').hidden = true;
        await playHero(next);
      } else await operation(next, 'cast');
      if (pending) continue;
      $('#loading').hidden = true;
      status('Đang phát · tốc độ gốc');
      if ($('#loop').checked)
        loopTimer = setTimeout(() => void choose(selected), repeatDelay(next));
    } catch (e) {
      $('#loading').hidden = true;
      status('Không phát được: ' + e.message, true);
    } finally {
      busy = false;
      $('#replay').disabled = false;
      $('#pause').disabled = false;
    }
  }
}
$('#search').oninput = renderList;
$('#group').onchange = renderList;
for (const b of document.querySelectorAll('[data-kind]'))
  b.onclick = () => {
    kind = b.dataset.kind;
    for (const other of document.querySelectorAll('[data-kind]'))
      other.setAttribute('aria-pressed', String(other === b));
    renderList();
  };
$('#replay').onclick = () => void choose(selected);
$('#proc').onchange = () => void choose(selected);
$('#pause').onclick = () => {
  clearTimeout(loopTimer);
  setPaused(!paused);
};
$('#zoom').onchange = () => review().gallery.setZoom(Number($('#zoom').value));
$('#fullscreen').onclick = () =>
  void $('#stage')
    .requestFullscreen()
    .catch((e) => status(e.message, true));
$('#loop').onchange = () => {
  clearTimeout(loopTimer);
  if ($('#loop').checked && !paused && !busy)
    loopTimer = setTimeout(() => void choose(selected), repeatDelay(selected));
};
window.addEventListener('pagehide', () => {
  clearTimeout(loopTimer);
});
async function boot() {
  try {
    const r = await fetch('/__visual_review');
    if (!r.ok) throw Error('Service preview chưa chạy');
    cases = await r.json();
    for (const g of new Set(cases.map((c) => c.group))) {
      const o = document.createElement('option');
      o.value = g;
      o.textContent = groupName(g);
      $('#group').append(o);
    }
    renderList();
    await waitFor(() => client()?.galleryStart && review()?.gallery);
    await client().galleryStart();
    ready = true;
    const requested = decodeURIComponent(location.hash.slice(1));
    await choose(
      selected ??
        cases.find((c) => c.id === requested) ??
        cases.find((c) => c.id === 'hoa_van_chuong') ??
        cases[0],
    );
  } catch (e) {
    $('#loading').textContent = e.message;
    status(e.message, true);
  }
}
void boot();
