import { test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
test('Tây Độc standalone Phaser sprite and choreography review', () => {
  console.log(
    execFileSync(
      'python',
      ['-X', 'utf8', 'assets/reviews/tay_doc_v02/verify_assets.py'],
      {
        cwd: process.cwd(),
        timeout: 30_000,
        encoding: 'utf8',
      },
    ),
  );
  const result = execFileSync(
    process.execPath,
    ['assets/reviews/tay_doc_v02/verify_preview.mjs'],
    {
      cwd: process.cwd(),
      env: { ...process.env, TAY_DOC_REVIEW_PORT: '5398' },
      timeout: 110_000,
      encoding: 'utf8',
    },
  );
  console.log(result);
});
