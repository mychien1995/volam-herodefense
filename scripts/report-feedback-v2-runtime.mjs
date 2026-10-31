/** Read-only integration audit; writes new runtime review evidence only. */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  feedbackArt,
  feedbackTag,
  artRef,
} from '../apps/game-client/src/feedback-art.ts';
import {
  feedbackBindings,
  basicFeedbackArt,
} from '../apps/game-client/src/feedback-bindings.ts';
// Reuse the server package's installed tsx CLI; do not add dependencies.
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const out = 'docs/evidence/m3c3-feedback-v2-runtime/';
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const protectedBefore = read(out + 'protected-art-baseline.json');
const changed = Object.entries(protectedBefore)
  .filter(([p, h]) => !existsSync(p) || sha(p) !== h)
  .map(([p]) => p);
if (changed.length) throw Error('Protected art changed: ' + changed.join(', '));
const vectors = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
const rows = [];
function add(skill, stage, ref) {
  if (!ref) return;
  const tags = [
    ...new Set(
      vectors.map(([x, y]) => {
        const tag = feedbackTag(ref, x, y);
        if (!tag)
          throw Error(
            'Unresolved mapping ' + skill + '/' + stage + '/' + ref.prefix,
          );
        return tag.name;
      }),
    ),
  ];
  rows.push({ skill, stage, asset: ref.asset, prefix: ref.prefix, tags });
}
for (const [id, b] of Object.entries(feedbackBindings)) {
  add(id, 'cast', b.cast);
  for (const key of ['release', 'impact'])
    (b[key] ?? []).forEach((r, i) => add(id, key + ':' + i, r));
  for (const key of [
    'projectile',
    'control',
    'loopCharacter',
    'endingCharacter',
    'counterCharacter',
    'finisherCharacter',
  ])
    add(id, key, b[key]);
  for (const [stage, refs] of Object.entries(b.pulses ?? {}))
    refs.forEach((r, i) => add(id, stage + ':' + i, r));
  (b.sustain ?? []).forEach((s, i) => {
    for (const key of ['opening', 'loop', 'ending'])
      add(id, `status(${s.kinds.join('|')}):${i}:${key}`, s[key]);
  });
  for (const key of ['opening', 'loop', 'ending'])
    add(id, 'area:' + key, b.area?.[key]);
  for (const key of ['cast', 'ground'])
    add(id, 'server empowered:' + key, b.empowered?.[key]);
  for (const key of ['release', 'impact'])
    (b.empowered?.[key] ?? []).forEach((r, i) =>
      add(id, 'server empowered:' + key + ':' + i, r),
    );
}
for (const [id, stages] of Object.entries({
  cai_bang_bong: ['thrust', 'sweep', 'lift', 'smash'],
  cai_bang_chuong: ['dragon'],
  thien_son_phien: ['accepted A'],
  thien_son_dao: ['accepted A'],
  vo_dang_quyen: ['left_palm', 'right_palm'],
  vo_dang_kiem: ['visual cut1', 'visual cut2'],
  thieu_lam_quyen: ['left_fist', 'right_fist'],
  thieu_lam_dao: ['accepted A'],
}))
  stages.forEach((stage, i) => {
    const b = basicFeedbackArt(id, stage, i + 1);
    add(id, stage + ':character', b?.ref);
    add(id, stage + ':VFX', b?.effect);
    b?.effects?.forEach((r, j) => add(id, stage + ':VFX:' + j, r));
  });
for (const [id, pack, role, prefixes] of [
  ['thien_son_phien', 'thien_son_fan_v2', 'projectile', ['return']],
  ['thien_son_phien', 'thien_son_fan_v2', 'character', ['catch']],
  ['thien_son_phien', 'thien_son_fan_v2', 'impact', ['return_hit']],
  [
    'bach_phien_phong_bao',
    'thien_son_fan_v2',
    'projectile',
    [
      'storm_fan_right',
      'storm_fan_down_right',
      'storm_fan_down',
      'storm_fan_down_left',
      'storm_fan_left',
      'storm_fan_up_left',
      'storm_fan_up',
      'storm_fan_up_right',
    ],
  ],
  ['thien_ha_vo_cau', 'thien_ha_vo_cau_dogs_v2', 'projectile', ['dog_run']],
  [
    'thai_cuc_than_cong',
    'vo_dang_shield_formation_v2',
    'aura',
    ['mana_absorb', 'mana_depleted'],
  ],
  [
    'thai_cuc_tran',
    'vo_dang_shield_formation_v2',
    'ground',
    ['inward_response'],
  ],
  [
    'dich_can_kinh',
    'thieu_lam_hands_combo_v2',
    'aura',
    ['gentle_regen_opening', 'gentle_regen_loop', 'gentle_regen_ending'],
  ],
])
  for (const p of prefixes) add(id, 'state/event:' + p, artRef(pack, role, p));
const codeFiles = [
  'apps/game-client/src/feedback-art.generated.json',
  'apps/game-client/src/feedback-art.ts',
  'apps/game-client/src/feedback-bindings.ts',
  'apps/game-client/src/feedback-vfx.ts',
  'apps/game-client/src/skill-art-registry.ts',
  'apps/game-client/src/skill-vfx.ts',
  'apps/game-client/src/arena-scene.ts',
  'apps/game-client/src/main.ts',
  'apps/game-client/tsconfig.json',
  'apps/game-client/src/forest-creep-review.ts',
  'scripts/prepare-assets.mjs',
  'scripts/prepare-feedback-v2-art.mjs',
  'scripts/prepare-feedback-v2-atlas.py',
  'scripts/report-feedback-v2-runtime.mjs',
  'playwright.feedback-v2.config.ts',
  'tests/e2e/feedback-v2-setup.ts',
  'tests/e2e/feedback-v2.spec.ts',
  'tests/e2e/m3c3.spec.ts',
  'tests/feedback-v2-art.test.ts',
];
const batches = [
  '01-cai-bang',
  '02-thien-son',
  '03-vo-dang',
  '04-thieu-lam',
].map((n) => {
  const o = read(out + n + '-observations.json');
  const cleanup = [o.caster, o.observer].map((v) =>
    Object.fromEntries(
      ['persistent', 'projectiles', 'transient', 'poses'].map((k) => [
        k,
        v.skills.feedback[k].length,
      ]),
    ),
  );
  return {
    name: n,
    coverage: o.coverage,
    errors: o.errors,
    cleanup,
    observedCasterFrames: o.caster.skills.feedback.observedFrames.length,
    observedPeerFrames: o.observer.skills.feedback.observedFrames.length,
  };
});
const packing = read(
  'apps/game-client/public/assets/feedback_v2_runtime/packing_manifest.json',
);
const playwright = read(out + 'playwright-results.json');
const finalBrowser = read(out + 'final-cadence-browser-results.json');
const fixedBrowser = read(out + 'focused-fixed-browser-results.json');
function cases(report) {
  const found = [];
  function visit(suite) {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests ?? []) {
        const result = test.results.at(-1);
        found.push({
          name: spec.title,
          project: test.projectName,
          status: result?.status,
          durationMs: result?.duration,
        });
      }
    for (const child of suite.suites ?? []) visit(child);
  }
  for (const suite of report.suites) visit(suite);
  return found;
}
const required = cases(finalBrowser),
  latest = new Map(required.map((c) => [c.project + ':' + c.name, c]));
for (const c of [...cases(fixedBrowser), ...cases(playwright)])
  latest.set(c.project + ':' + c.name, c);
const resolved = required.map((c) => latest.get(c.project + ':' + c.name));
const supplementary = cases(playwright).filter(
  (c) => !required.some((r) => r.project === c.project && r.name === c.name),
);
const natural = read(out + 'six-player-observations.json');
const listEvidence = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? listEvidence(dir + e.name + '/') : [dir + e.name],
    )
    .sort();
const report = {
  status: 'INTEGRATED_PENDING_DIRECTOR_RUNTIME_APPROVAL',
  runtimeApproved: false,
  phaserVersion: read('apps/game-client/node_modules/phaser/package.json')
    .version,
  mechanismContract: {
    path: 'docs/M3C3_FEEDBACK_IMPLEMENTATION.md',
    sha256: sha('docs/M3C3_FEEDBACK_IMPLEMENTATION.md'),
  },
  protectedArt: { checked: Object.keys(protectedBefore).length, changed },
  components: feedbackArt.length,
  tags: feedbackArt.reduce((n, c) => n + c.animations.length, 0),
  frames: feedbackArt.reduce(
    (n, c) => n + c.animations.reduce((n, a) => n + a.frames.length, 0),
    0,
  ),
  nativePixelsPreserved: packing.components.every(
    (c) => c.visiblePixelsIdentical && c.sourceSizePreserved,
  ),
  sourcePixels: packing.sourcePixels,
  runtimePixels: packing.runtimePixels,
  batches,
  evidenceFiles: listEvidence(out),
  playwright: playwright.stats,
  verification: {
    finalPipelineLog: out + 'final-check-cadence-and-facing.log',
    finalPipelineExitCode: 1,
    explanation:
      'Final pipeline typechecks, 8 workflow checks, 338 unit/integration tests, production build and 12 asset validators passed; browser reported 6 pass/2 fixture failures. Only corrected browser fixtures were rerun; no subsequent runtime/art/mechanic changes.',
    originalFinalBrowser: finalBrowser.stats,
    focusedBrowserRerun: fixedBrowser.stats,
    supplementaryCases: supplementary,
    supplementaryCasesPassed:
      supplementary.length > 0 &&
      supplementary.every((c) => c.status === 'passed'),
    combinedRequiredCases: resolved,
    requiredCasesPassed:
      resolved.length === 8 && resolved.every((c) => c.status === 'passed'),
    fixtureTypecheck:
      'pnpm exec tsc -p tsconfig.tools.json --noEmit: exit0 after fixture corrections',
  },
  naturalSixPlayer: {
    scope: natural.scope,
    heroes: natural.heroes.map((h) => ({
      school: h.schoolId,
      hp: h.hp,
      xp: h.xp,
      level: h.level,
    })),
    errors: natural.errors,
    cameraZoom: natural.readability.presentation.zoom,
    cameraRotation: natural.readability.presentation.rotation,
    gentleRegenObserved:
      natural.readability.presentation.skills.feedback.played.filter((k) =>
        k.includes('gentle_regen'),
      ),
    review:
      'Normal-zoom spaced arena view keeps six bodies/feet distinguishable; tight stacked dungeon combat partially occludes bodies and faces under overlapping owned effects. No blanket 60FPS or flawless crowd-readability claim.',
  },
  mappings: rows,
  files: codeFiles.map((path) => ({ path, sha256: sha(path) })),
  runtimeAssets: feedbackArt.map((c) => ({
    id: c.id,
    source: c.source,
    sourceSheet: c.sourceSheet,
    sourceAtlas: c.sourceAtlas,
    sheet: 'apps/game-client/public/' + c.sheet,
    atlas: 'apps/game-client/public/' + c.atlas,
    sheetSha256: sha('apps/game-client/public/' + c.sheet),
    atlasSha256: sha('apps/game-client/public/' + c.atlas),
  })),
  limitations: [
    'Fan hit events omit projectile ID/leg. Confirmed hit selects outbound/return art from nearest live/recent authoritative projectile; no hits are invented.',
    'Formation protocol omits trapped IDs/attempted movement. Inward cue is a cosmetic inference from consecutive authoritative creep positions contacting the inside boundary, replacing the same border sprite.',
    'Mixed-school skills retain owner costume through existing character motion plus new VFX; school-specific character replacements apply only to matching school.',
    'Frame fixtures are presentation-only and separate from real server combat. Native-cycle coverage does not claim every empowered variant arose naturally in combat.',
    'Automated runtime verification does not grant final director art approval; source manifests and approval locks remain unchanged.',
  ],
};
writeFileSync(
  out + 'integration-audit.json',
  JSON.stringify(report, null, 2) + '\n',
);
writeFileSync(
  out + 'runtime-mapping.md',
  '# Actual runtime skill/stage mapping\n\nGenerated from the shipped client bindings, resolved against supplied metadata. Each row contains exact registered tag names. Contact frames never apply damage.\n\n| Skill | Stage / lifetime | Component | Actual tags |\n|---|---|---|---|\n' +
    rows
      .map(
        (r) =>
          `| ${r.skill} | ${r.stage.replace(/\|/g, '\\|')} | ${r.asset} | ${r.tags.join(', ')} |`,
      )
      .join('\n') +
    '\n',
);
console.log(
  JSON.stringify({
    protectedFiles: report.protectedArt,
    components: report.components,
    tags: report.tags,
    frames: report.frames,
    mappings: rows.length,
    browser: report.playwright,
  }),
);
