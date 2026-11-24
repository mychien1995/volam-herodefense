(() => {
  const { schools, cases, cels } = window.contactPreview;
  const $ = (id) => document.getElementById(id);
  const controls = { move: $('case'), variant: $('variant'), target: $('target') };
  const buttons = new Map();
  let school = 'cai-bang';
  const labels = {
    thrust: 'thọc', sweep: 'quét', lift: 'hất', smash: 'đập',
    left_fist: 'quyền trái', front_kick: 'cước thẳng', roundhouse_kick: 'cước xoay',
    wave_first: 'luồng thứ nhất', wave_second: 'luồng thứ hai',
    cross_0: 'đường chữ X thứ nhất', cross_2: 'đường lướt cuối'
  };
  function render() {
    const move = cases[Number(controls.move.value)];
    const index = Number(controls.variant.value);
    const art = cels[move.variants[index]];
    const phases = move.play[controls.target.value];
    const expectedPhase = move.frames[index];
    const sample = phases[expectedPhase] ?? phases.contact ?? Object.values(phases)[0];
    const active = schools[move.school];
    document.documentElement.style.setProperty('--accent', active.color);
    $('palette').textContent = active.palette;
    $('art-note').textContent = move.artNote;
    $('gameplay').textContent = move.gameplay;
    $('damage').textContent = sample.hit.damage.toLocaleString('vi-VN') + ' HP';
    $('baseline').src = $('backdrop').src = sample.file;
    $('stamp').src = $('art').src = $('png').href = art.file;
    const low = ['palm-afterburn', 'palm-aura-ember'].includes(art.id);
    const y = low ? (sample.anchor.y * .55 + sample.feet.y * .45) : sample.anchor.y;
    $('stamp').style.left = (sample.anchor.x / 4.8) + '%';
    $('stamp').style.top = (y / 2.7) + '%';
    const rotation = art.id === 'sabre-peach-last' ? 0 : Math.atan2(sample.fy, sample.fx);
    $('stamp').style.transform = 'translate(-50%, -50%) rotate(' + rotation + 'rad)';
    const samePhase = move.variants.length === 1 || expectedPhase === sample.stage;
    $('sample').textContent = 'Hit #' + sample.hit.id + ' · tick ' + sample.hit.tick
      + (labels[sample.stage] ? ' · ' + labels[sample.stage] : '')
      + (samePhase ? '' : ' · Khung đối chiếu dùng chung của chiêu');
  }
  function variants() {
    const move = cases[Number(controls.move.value)];
    controls.variant.replaceChildren(...move.variants.map((id, i) => new Option(cels[id].title, i)));
    render();
  }
  function choose(next, initial) {
    school = next;
    buttons.forEach((button, id) => button.setAttribute('aria-pressed', String(id === school)));
    controls.move.replaceChildren(...cases.flatMap((move, i) => move.school === school
      ? [new Option(move.branch + ' · ' + move.key + ' · ' + move.title, i)] : []));
    if (initial) controls.move.value = String(cases.findIndex((move) => move.ability === 'hoanh_tao_bong'));
    variants();
  }
  for (const [id, spec] of Object.entries(schools)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = spec.name;
    button.addEventListener('click', () => choose(id, false));
    buttons.set(id, button);
    $('schools').append(button);
  }
  controls.move.addEventListener('change', variants);
  controls.variant.addEventListener('change', render);
  controls.target.addEventListener('change', render);
  choose(school, true);
})();
