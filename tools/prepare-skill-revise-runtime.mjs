import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const catalogue = JSON.parse(
  readFileSync('assets/reviews/skill-revise-v01/catalogue.json', 'utf8'),
);
const packs = catalogue.packs.filter(
  (p) => p.id !== 'wind-gust' && p.id !== 'revised-icons',
);
for (const [id, path] of [
  ['hammer-v2', 'skill-revise-feedback-v02/thien-su-v2'],
  ['hammer-sweep-v3', 'skill-revise-sweep-v03/sweep-v3'],
  ['wind-crescent', 'skill-revise-feedback-v02/wind-crescent-v2'],
  ['hammer-coherent-v4', 'skill-revise-feedback-v04/hammer-coherent-v4'],
  ['hammer-slam-v5', 'skill-revise-thien-su-v05/hammer-slam-v5'],
  ['hammer-combo-v6', 'skill-revise-thien-su-v06/hammer-combo-v6'],
  ['hammer-combo-v7', 'skill-revise-thien-su-v07/hammer-combo-v7'],
  ['hammer-sweep-v8', 'skill-revise-thien-su-v08/hammer-sweep-v8'],
])
  packs.push({
    id,
    sourcePng: `assets/exports/${path}/body.png`,
    sourceAtlas: `assets/exports/${path}/body.json`,
    pivot: id === 'wind-crescent' ? [0.5, 0.5] : [0.5, 320 / 448],
    scale: id === 'wind-crescent' ? 0.65 : 0.5,
  });
const result = packs.map((p) => ({
  id: p.id,
  png: '/' + p.sourcePng.replace('assets/exports/', 'assets/'),
  atlas: '/' + p.sourceAtlas.replace('assets/exports/', 'assets/'),
  pivot: p.pivot,
  scale: p.scale,
  frames: Object.keys(JSON.parse(readFileSync(p.sourceAtlas, 'utf8')).frames),
  sha256: createHash('sha256').update(readFileSync(p.sourcePng)).digest('hex'),
}));
writeFileSync(
  'apps/game-client/src/skill-revise-assets.generated.json',
  JSON.stringify(result, null, 2) + '\n',
);
console.log(
  `Runtime metadata: ${result.length} tracked packs; source PNG bytes preserved.`,
);
