import { execFileSync } from 'node:child_process';

/** Observe only. Never resolve, stage, reset, abort or commit a caller's merge. */
export function requireQaCheckoutReady(root) {
  const run = (args) =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      windowsHide: true,
    });
  const unmerged = [
    ...new Set(
      run(['diff', '--name-only', '--diff-filter=U', '-z'])
        .split('\0')
        .filter(Boolean),
    ),
  ];
  if (unmerged.length)
    throw Error(
      `QA checkout has unresolved conflicts: ${unmerged.join(', ')}. Finish the merge before live iteration; no merge files were changed.`,
    );
  return { head: run(['rev-parse', 'HEAD']).trim(), unresolvedConflicts: 0 };
}
