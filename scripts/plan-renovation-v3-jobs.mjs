import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { m1Config, bossSkillNames } from '@volam/game-data';
const base = 'assets/source/renovation-v3';
mkdirSync(base + '/raw', { recursive: true });
const actors = JSON.parse(readFileSync(base + '/actors.json'));
const poses = {
  hero_cai_bang: [
    'both hands raise the long wooden staff above head, elbows bent',
    'forceful forward/downward staff extension ending in a ground slam',
    'wide horizontal two-handed staff sweep, robe and red ribbon trailing',
    'upright staff in left hand, free right palm extended in a summoning/guard gesture',
  ],
  hero_cai_bang_chuong: [
    'coiled right palm at waist, left palm guarding chest',
    'right open palm thrust fully forward, left hand pulled back',
    'both palms thrust forward in a powerful dragon-palm lunge',
    'stable bent-knee channeling stance, open palms forming a small sphere in front of chest',
  ],
  hero_thien_son_dao: [
    'saber hilt above head, blade raised behind shoulder',
    'decisive downward saber cut with correct sharp blade edge facing the cut',
    'low forward dash stride, saber held low behind the right hip',
    'wide spinning saber slash, ponytail and robe hems trailing',
  ],
  hero_vo_dang: [
    'left fist jab, right fist guarding chest',
    'right open-palm strike from waist toward facing',
    'two palms circling outward in a balanced yin-yang pushing gesture',
    'steady martial meditation stance with two hands joined at chest, no weapon',
  ],
  hero_thieu_lam: [
    'powerful left fist punch, right fist guards ribs',
    'powerful right fist punch, left palm guards chest',
    'front kick with raised right boot directed toward facing, both fists guarding',
    'roundhouse side kick, planted supporting leg and outward sweeping kicking leg',
  ],
  hero_thieu_lam_dao: [
    'large saber raised high with hilt above head for anticipation',
    'broad forceful attached saber slash across the front, continuous blade silhouette',
    'saber upright in right hand, left palm raised in a roaring defensive gesture',
    'firm protective channel stance with saber held low and left palm pressed at chest',
  ],
  dong_ta: [
    'straight sword thrust toward facing, left fingers poised at chest',
    'right index finger flick forward, other hand holds the jade flute close to waist',
    'jade flute held to lips in both hands, actually playing it',
    'sword held low, one palm lifted in a summoning seal',
  ],
  mai_sieu_phong: [
    'both clawed hands coiled beside shoulders in anticipation',
    'one claw lunges forward with spread hooked fingers',
    'both arms spread wide then claw inward in a pulling gesture',
    'right hand throws forward an invisible projectile, left claw guarding',
  ],
  hoang_dung: [
    'jade folding fan raised near shoulder in a musical support gesture',
    'open fan swept forward with right arm extended',
    'low sideways evasive step with fan guarding chest',
    'both hands raised in a gentle healing/support seal, fan folded at waist',
  ],
  tay_doc: [
    'skull-headed green-orb staff raised over right shoulder',
    'staff sweeps across front at waist height',
    'free palm thrust releases poison, staff planted firmly in left hand',
    'bent-knee stance with staff upright and free palm raised for summoning',
  ],
  tay_doc_cap_mo: [
    'low crouching toad stance with both hands near ground',
    'forceful forward palm thrust from crouch',
    'arms spread wide, chest raised in poison eruption stance',
    'both palms drive down to ground, knees bent deeply for shockwave',
  ],
  tay_doc_snake: [
    'serpent coils low, head drawing back in anticipation',
    'serpent head and open jaws lunge forward, body still visibly coiled',
    'serpent spits from raised open mouth, fangs clearly visible',
    'serpent recoils after bite with neck curving back',
  ],
  nam_de: [
    'right index finger aimed straight forward, left palm guarding',
    'both hands project a broad palm wave forward',
    'cross-legged healing meditation, hands calm at abdomen',
    'standing with both arms raised overhead to channel golden heavenly light',
  ],
  bac_cai: [
    'staff held in both hands, raised diagonally above shoulder',
    'forceful forward staff thrust with both hands',
    'staff low in left hand, right open palm thrusts forward in dragon-palm attack',
    'staff upright at side, both arms spread in a summoning/channeling stance',
  ],
  vuong_trung_duong_p1: [
    'straight sword poised beside face in anticipation',
    'forward sword thrust with long clean unbroken blade',
    'broad sword slash across the front with trailing maroon sash',
    'sword upright before chest, free fingers forming a seven-star channel seal',
  ],
  vuong_trung_duong_p2: [
    'bare-handed open palm thrust, no weapon anywhere',
    'right index and middle fingers extended forward as an invisible sword gesture',
    'both arms extended outward in a thunder/element channel stance',
    'martial meditation with palms joined at chest, bare torso and maroon sash consistent',
  ],
  bac_cai_black_dog: [
    'black dog crouches, head drawn back before bite',
    'black dog lunges forward with jaws open and forepaws extended',
    'black dog snaps jaws at nearby target with arched shoulders',
    'black dog recoils and replants four paws after the bite',
  ],
  chu_ba_thong: [
    'playful wide double-fist boxing stance, one fist extends forward',
    'both palms push forward and apart in a two-hand attack',
    'one arm reaches overhead while opposite palm strikes down toward ground',
    'raises the wine gourd to mouth and drinks with head slightly tilted',
  ],
  toan_chan_disciple: [
    'straight sword raised beside shoulder before thrust',
    'right-handed forward sword thrust, left palm guarding chest',
    'wide straight sword slash to the front',
    'one hand throws a small invisible wine bottle while sword is held low in the other',
  ],
  hoan_nhan_hong_liet: [
    'huge broad saber raised above shoulder, heavy armored anticipation',
    'massive broad saber cuts horizontally across the front',
    'saber raised overhead while free hand commands troops forward',
    'one hand slams down to conjure ground lava, saber held firmly in the other',
  ],
  mongol_infantry: [
    'shield raised and curved saber coiled by shoulder',
    'curved saber thrust/slash forward from behind shield',
    'wide horizontal curved-saber sweep, shield guarding side',
    'shield forward and saber pulled back during recovery',
  ],
  mongol_archer: [
    'bow upright, arrow nocked, string hand at chest',
    'full bow draw, arrow and aiming direction clearly readable',
    'releases arrow with drawing hand pulled back, bow still extended',
    'lowers bow slightly and reaches for a new arrow',
  ],
  kim_luan: [
    'both golden chakram wheels held wide at shoulders before throw',
    'right arm throws a golden wheel forward, left wheel guards chest',
    'both golden wheels spin outward at arms length in a warding stance',
    'kneeling ground strike with one golden wheel raised and opposite palm driving down',
  ],
  hoac_do: [
    'folding fan raised above right shoulder before throw',
    'open fan thrown forward with empty releasing right hand',
    'fan swept across front in a windstorm gesture',
    'folded fan in left hand, right hand flicks a small invisible poison nail forward',
  ],
  dat_nhi_ba: [
    'massive heavy mace raised high in both hands',
    'heavy mace slams down to ground with bent knees',
    'wide heavy-mace sweep horizontally across front',
    'stable planted stance with mace upright, guarding against incoming strike',
  ],
  kim_elephant: [
    'armored elephant raises trunk and one foreleg before charge',
    'elephant lunges forward, tusks level and trunk thrust out',
    'elephant drives front feet down in a ground-stomping impact',
    'elephant raises trunk and both front shoulders to trumpet',
  ],
  ly_mac_sau: [
    'white horsetail whisk raised above right shoulder',
    'whisk sweeps rapidly across front with flowing unbroken white hairs',
    'left palm thrusts forward while right hand holds whisk low',
    'empty fingertips throw several invisible needles, whisk in the opposite hand',
  ],
  co_mo_am_binh: [
    'ghostly sword held beside shoulder in anticipation',
    'ghostly straight-sword thrust with free hand pointing forward',
    'wide ghostly sword sweep in front',
    'one empty palm throws an invisible needle, sword held low in other hand',
  ],
};
// The second monk sheet keeps Ca Diep's actual stationary stomp and Buddhist channels distinct.
const monkSpecial = [
  'stationary right-foot stomp into ground, right knee bent and both fists guarding',
  'slow powerful open-palm strike with left hand supporting right forearm',
  'both forearms crossed over chest in an indestructible guarding stance',
  'martial meditation with palms together at chest, grounded feet and calm face',
];
const common =
  'Original detailed chibi wuxia high-density 2D gameplay sprite artwork. Crisp continuous outlines, readable large highlight/shadow groups, fine layered cloth and material detail. Match the exact supplied character identity, hairstyle, age, costume, palette and weapon. Fixed elevated orthographic three-quarter TOP-DOWN overworld camera, not isometric or side-scrolling. Genuine alpha transparent PNG; all empty areas and all cell gutters alpha zero, no background, no matte, no checkerboard, no fog rectangle, no baked floor shadow, no text, no VFX.';
const jobs = [];
for (const [id, columns] of Object.entries(poses)) {
  const actor = actors.find((a) => a.id === id);
  if (!actor) throw Error(id);
  jobs.push({
    id: id + '_actions',
    kind: 'body',
    actor: id,
    grid: [4, 4],
    columns,
    reference: base + '/references/' + id + '.png',
    prompt:
      common +
      ' Create a 4-column by 4-row ACTION KEYPOSE ATLAS, 2048 square. Exactly sixteen complete isolated character poses, equal body/head scale and ground foot baseline. Rows face DOWN toward viewer, LEFT, RIGHT, UP showing the BACK. All poses must respect that row facing. Columns are: ' +
      columns.map((p, i) => i + 1 + ': ' + p).join('; ') +
      '. Keep hands, weapon and feet visible and clearly separated. Maintain right handedness in every facing, no arbitrary mirror swap. Generous transparent gutters, each complete figure wholly inside its quadrant. Frame is spacious for weapon extension. Do not copy the idle pose sixteen times.',
  });
}
jobs.push({
  id: 'hero_thieu_lam_special',
  kind: 'body',
  actor: 'hero_thieu_lam',
  grid: [4, 4],
  columns: monkSpecial,
  reference: base + '/references/hero_thieu_lam.png',
  prompt:
    common +
    ' Create exactly a 4-column by 4-row atlas, 2048 square. Rows face DOWN, LEFT, RIGHT, UP/back. Columns are ' +
    monkSpecial.map((p, i) => i + 1 + ': ' + p).join('; ') +
    '. Sixteen full-body isolated keyposes. Keep body/head proportions and feet baseline consistent; whole figure within each cell, generous transparent gutters.',
});
const motifs = {
  hoa_van_chuong:
    'compact open-palm shaped orange fire projectile moving RIGHT, with short tapered flame tail; gathering, launch, flight, spark impact',
  cuong_long_loan_vu:
    'dense orange-red dragon fireball moving RIGHT then expanding into a compact fiery explosion with ember fragments',
  phi_long_tai_thien:
    'broad forward orange dragon-palm shockwave moving RIGHT, sharply curved leading fire edge and swept-back tail',
  khang_long_huu_hoi:
    'small translucent fiery dragon curl encircling an EMPTY central torso space, ember ring at feet; coherent gathering, stable glow, flicker, fade',
  hang_long_hoa_vu:
    'large readable golden-orange serpentine FIRE DRAGON flying RIGHT, head and open jaws at right, body tapered into flaming tail at left; four travel phases',
  hoanh_tao_bong:
    'fiery orange horizontal STAFF SWEEP arc around an EMPTY central character space, wide radial curve and short embers, no staff or body',
  pha_giap_bong:
    'long narrow fiery ground-crack stripe directed RIGHT with a sharp ground-impact burst at far right; no airborne projectile, no character',
  cam_long_cong:
    'orange-gold dragon claw made of qi reaches RIGHT and curls inward, a clear claw/grasp silhouette with inward flowing streaks; no explosion or stun stars',
  truy_phong_bong:
    'narrow forward orange speed streak moving RIGHT, sharp short staff-shaped leading qi accent and sparse wake sparks; no actual weapon or character',
  thien_ha_vo_cau:
    'orange fire-dog spirit silhouettes circling an EMPTY centre with a sweeping staff-qi arc; four phases ending in a compact ground-slam explosion',
  phi_anh_tram:
    'icy cyan-white attached saber slash sweeping RIGHT, thin bright blade core and short flowing cyan ribbons; no physical character or detached swords',
  truy_hon_dao:
    'one sharp cyan-white curved SABER QI blade moving RIGHT with a short double-stream ribbon tail, four coherent travel/impact phases',
  phong_anh_hoan_vi:
    'pale cyan evasive wind AFTERIMAGE streak flowing RIGHT with a hollow empty middle, then a clear short counter-slash crescent; no character',
  liet_phong_dao:
    'huge single upright cyan saber-qi blade in anticipation, then a forceful downward saber cut toward RIGHT, followed by ground impact and thin fade streaks',
  bach_liet_thien_kich:
    'dense controlled cyan saber SLASH FLURRY in a narrow frontal fan directed RIGHT, alternating diagonal blade ribbons, then one stronger finishing cut',
  luong_nghi_thu:
    'black-and-white yin-yang qi projectile moving RIGHT, sharp white leading crescent and dark countercurl, balanced small core; no broad fog',
  huyen_am_chuong:
    'large silver-white sonic PALM WAVE moving RIGHT, clear open-palm core and concentric short wavelets behind it, faint cool blue edging',
  duong_khi_kich:
    'compact bright white qi palm projectile moving RIGHT with a subtle warm silver core and two thin flowing tails; gathering, launch, flight, impact',
  thai_cuc_than_cong:
    'a transparent spherical mana SHIELD around EMPTY central character space with two yin-yang curved bands and sparse silver-blue runes; all inner empty regions remain transparent',
  thai_cuc_tran:
    'fixed elliptical yin-yang FLOOR formation with a dark/white balanced central emblem and thin silver boundary ring; four formation/loop/fade phases, no character',
  la_han_quyen:
    'golden FIST impact/attached punch trail directed RIGHT, readable clenched-fist qi silhouette and compact sparks, not a projectile swarm',
  vi_da_quyen:
    'golden ground explosion with a sharp circular cracked-earth centre and upward spikes, four phases from small gathering glint to impact then fading dust; no body',
  dai_luc_kim_cuong_chuong:
    'one large strong golden OPEN PALM directed RIGHT, gathering lines behind palm, burst impact at palm face then gold fragment fade',
  toan_phong_thoai:
    'golden upright travelling TORNADO with crisp spiral ribbons, narrow ground base and clear hollow interior, four coherent spin phases; no body',
  hoanh_tao_cuoc:
    'earth MOUND travelling RIGHT, brown/gold rising stone ridge with a sharp bright leading crest and flying small rock fragments, four chronological motion phases',
  vo_anh_cuoc:
    'one golden FOOT-shaped qi strike moving RIGHT, clearly readable sole/toes silhouette, long narrow golden motion streaks; four phases; no actor and no triple-lane arrangement baked in',
  kim_cang_bat_hoai:
    'thin gold defensive shell with segmented vajra bands around EMPTY character space, stable silhouette and a few firm highlights; no opaque filled bubble',
  nhu_lai_niet_ban:
    'golden spectral seated BUDDHA silhouette with transparent gaps, one broad descending heavenly PALM, and a separate thin elliptical Sanskrit-like ornate FLOOR seal; four phase cels with gathering, Buddha apparition, palm impact, floor field',
  tru_ta:
    'one broad attached golden SABER SLASH curving toward RIGHT, bright continuous sharp core and short ornate spark accents; no detached crescent projectile',
  kim_quang_ho_tran:
    'thin warm gold protective elliptical ring and ascending filaments, EMPTY readable interior for characters, four subtle pulsing phases; no fog disks',
  tam_gioi_quy_thien:
    'one bold GOLDEN LION FACE roar made of qi, expanding warm-gold soundwave contours around it; four stages of gathering, roar, ripple, fade; no body',
  bat_dong_minh_vuong:
    'clear warm-gold HEALING pulse, narrow elliptical ring opening into several thin upward gold filaments and small pure light motes; four phases, empty centre, no filled white disk',
  nhu_lai_thien_diep:
    'a golden Buddha halo behind EMPTY character space and a thin leaf-shaped golden BLADE projectile directed RIGHT; four cels, aura gathering, coherent Buddha halo, blade flight, blade impact',
};
for (const [id, motif] of Object.entries(motifs)) {
  const skill = m1Config.progression.skills[id];
  if (!skill) throw Error(id);
  jobs.push({
    id,
    kind: 'vfx',
    grid: [2, 2],
    skill: id,
    description: skill.descriptionVi,
    motif,
    prompt:
      'Original detailed high-density wuxia 2D game VFX, sharp luminous cores with controlled thin alpha fringes. Create a TWO BY TWO four-cel animation atlas, 1536 square. Cels in reading order: ' +
      motif +
      '. Same emission/ground centre and consistent scale in every cell. Every cel completely isolated with generous alpha-zero padding on every side; all four quadrants and their corners are genuinely transparent. Sparse emitter shapes only: NEVER add white/grey fog, vignette, a colored backdrop, a checkerboard or rectangular panel. No text, no UI, no character. Preserve physical meaning: projectiles face RIGHT, ground rings have an elevated top-down elliptical view. Beautiful authored light/shadow masses, continuous silhouettes. The game controls projectile trajectories and radii separately.',
  });
}
const bossFx = {
  dong_ta: [
    'silver/jade sword crescent and narrow thrust trail directed RIGHT',
    'small jade-white finger gem projectile with thin trailing spark line directed RIGHT',
    'pink peach blossom petals carried in narrow jade wind ribbons, transparent gaps',
    'jade flute soundwave rings with sparse white music-like flourishes, empty centre',
  ],
  mai_sieu_phong: [
    'three sharp purple-white claw slashes directed RIGHT',
    'spectral purple hooked claw reaching forward then pulling inward',
    'dark-purple skull-shaped poison projectile directed RIGHT',
    'thin purple inward wind vortex around an empty centre',
  ],
  hoang_dung: [
    'small jade-green folding fan projectile directed RIGHT',
    'green-gold healing musical note sparks with empty centre',
    'short pale-jade evasive wind trail directed RIGHT',
    'thin jade support halo with sparse flower glints, empty centre',
  ],
  tay_doc: [
    'curved dark-green skull-staff poison slash directed RIGHT',
    'thin green poison needle volley directed RIGHT',
    'small readable green poison cloud curls, transparent interior gaps and no rectangular haze',
    'green poison skull orb projectile directed RIGHT',
  ],
  tay_doc_cap_mo: [
    'broad toxic-green poison palm projectile directed RIGHT',
    'ground shockwave with sharp green ring and flying dark rock fragments',
    'toxic green radial needle burst around empty centre',
    'slender green poison stream with sharp bright leading core directed RIGHT',
  ],
  nam_de: [
    'broad gold open-palm shockwave directed RIGHT',
    'thin warm-gold fingertip beam directed RIGHT, bright straight continuous core',
    'thin golden healing/meditation ring, empty readable centre',
    'golden descending light pillar impact with thin gold ray edges, transparent gaps',
  ],
  bac_cai: [
    'orange-gold staff sweep and thin thrust trail directed RIGHT',
    'long golden fire-dragon palm wave moving RIGHT',
    'thin bright gold energy beam moving RIGHT with a firm left emission point',
    'gold vortex ring and fine tether/formation filaments around an empty centre',
  ],
  vuong_trung_duong_p1: [
    'silver-blue sword thrust/attached slash directed RIGHT',
    'thin bright blue forked lightning bolt descending from above',
    'small blue-white seven-star sword rune formation, empty centre',
    'silver-blue straight flying sword directed RIGHT with clean blade and short qi tail',
  ],
  vuong_trung_duong_p2: [
    'purple-white invisible finger-sword strike directed RIGHT',
    'five-element qi bursts in wood-green fire-red earth-ochre metal-white water-blue, separated crisp fragments',
    'thin white-purple pulse ring expanding around empty centre',
    'narrow silver-violet falling sword-rain streak with a clear pointed tip',
  ],
  chu_ba_thong: [
    'two broad pale-gold palm prints directed RIGHT',
    'large spectral empty-hand fists directed RIGHT',
    'orange-white floor trap seal ring with hollow centre',
    'dense but transparent pale-gold spinning palm wind ring around empty centre',
  ],
  hoan_nhan_hong_liet: [
    'red-orange broad saber-qi projectile directed RIGHT',
    'thin red-orange ground lava crack followed by a sharp small eruption',
    'red-gold arrow/bolt directed RIGHT with dark metal core',
    'red-orange descending cannon fire impact with compact debris and embers',
  ],
  kim_luan: [
    'gold metal chakram wheel spinning around its own centre',
    'gold dragon/elephant qi arc directed RIGHT',
    'brown-gold ground boulder fragment and compact ground shockwave',
    'thin golden cage/ward bars with transparent spaces, not an opaque panel',
  ],
  ly_mac_sau: [
    'thin silver ice needle directed RIGHT',
    'red-white corrosive palm wave directed RIGHT',
    'thin sweeping white horsetail-whisk trail in a forward arc',
    'dark violet-green poison palm cloud directed RIGHT with transparent gaps',
  ],
};
for (const [id, rows] of Object.entries(bossFx))
  jobs.push({
    id: id + '_effects',
    kind: 'boss-vfx',
    actor: id,
    grid: [4, 4],
    rows,
    prompt:
      'Original detailed high-density wuxia 2D game VFX, crisp continuous shapes and controlled bright cores. Create a FOUR COLUMN BY FOUR ROW 16-cel atlas, 2048 square. Each ROW is a different effect, each COLUMN is its chronological animation phase: gathering, clear active/flight, impact/strong active, fade. Row1: ' +
      rows[0] +
      '. Row2: ' +
      rows[1] +
      '. Row3: ' +
      rows[2] +
      '. Row4: ' +
      rows[3] +
      '. For directional cels all point RIGHT. All effects are independent isolated alpha shapes, no body or text. Exactly 16 complete cels, fully inside their cells and separated with generous transparent gutters. No white/grey/colored matte, NO fog rectangles, no checkerboard, no gradients filling the cells. Every unused pixel and every quadrant corner is alpha zero. Same emission centre and scale across each row. Ground formations use the fixed elevated top-down elliptical view.',
  });
writeFileSync(
  base + '/generation-jobs.json',
  JSON.stringify(
    { tool: 'OpenAI built-in image_gen', date: '2026-11-05', jobs },
    null,
    2,
  ) + '\n',
);
writeFileSync(
  base + '/boss-skill-names.json',
  JSON.stringify(bossSkillNames, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    jobs: jobs.length,
    body: jobs.filter((j) => j.kind === 'body').length,
    schoolVfx: jobs.filter((j) => j.kind === 'vfx').length,
    bossVfx: jobs.filter((j) => j.kind === 'boss-vfx').length,
  }),
);
