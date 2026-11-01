import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { writeIfChanged } from './asset-files.mjs';
const root = new URL('../', import.meta.url);
export function prepareApprovedAnimationArt() {
  const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
  const approval = read(
    'assets/reviews/skills/animation-review-v01/director-approval.json',
  );
  for (const [p, expected] of Object.entries({
    ...approval.approvedFiles,
    ...approval.retainedReferenceFiles,
  })) {
    const actual = createHash('sha256')
      .update(readFileSync(new URL(p, root)))
      .digest('hex');
    if (actual !== expected)
      throw Error('Approved animation preview changed: ' + p);
  }
  const manifest = read(
    'assets/exports/skills/animation-review-v01/manifest.json',
  );
  writeIfChanged(
    new URL('apps/game-client/src/approved-skill-assets.generated.json', root),
    JSON.stringify({ assets: manifest.assets }, null, 2) + '\n',
  );
}
