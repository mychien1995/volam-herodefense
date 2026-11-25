import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  keepDeploymentAsset,
  validateSelection,
  completeDeploymentPaths,
} from '../deploy-asset-selection.mjs';
const fixture = {
  version: 1,
  inputs: { 'loader.ts': 'a' },
  paths: ['/assets/renovation-v3/current.png'],
  failures: [],
};
test('DOM avatar and skill-icon URL builders cannot lose their files when absent from Phaser', () => {
  const selected = new Set();
  for (const path of [
    'cai-bang-bong-unified-v1/avatar.png',
    'vo-dang-kiem-unified-v1/avatar-body.png',
    'skill-revise-feedback-v04/icons/hoa-long.png',
    'renovation-v5/portrait-hero_vo_dang.png',
  ])
    assert.equal(keepDeploymentAsset(path, selected), true, path);
  assert.equal(
    keepDeploymentAsset('cai-bang-bong-unified-v1/body.png', selected),
    false,
  );
});
test('CSS and HTML portraits survive even when Phaser never requests them', () => {
  const paths = completeDeploymentPaths(fixture.paths, [
    ".vo-dang { background-image: url('/assets/renovation-v5/portrait-hero_vo_dang.png?v=1'); }",
    '<img src="/assets/ui/logo.png">',
  ]);
  const selected = validateSelection({ ...fixture, paths }, fixture.inputs);
  assert.equal(
    keepDeploymentAsset('renovation-v5/portrait-hero_vo_dang.png', selected),
    true,
  );
  assert.ok(selected.has('/assets/ui/logo.png'));
  assert.equal(paths.filter((path) => path === fixture.paths[0]).length, 1);
});
test('keeps current atlases and unrelated UI/audio while pruning unrequested historical atlas files', () => {
  const selected = validateSelection(fixture, fixture.inputs);
  assert.equal(
    keepDeploymentAsset('renovation-v3/current.png', selected),
    true,
  );
  assert.equal(
    keepDeploymentAsset('renovation-v3/current.json', selected),
    false,
  );
  assert.equal(
    keepDeploymentAsset('renovation-v2/review/old.png', selected),
    false,
  );
  assert.equal(
    keepDeploymentAsset('con-luan-thien-su-unified-v1/body.png', selected),
    false,
  );
  assert.equal(keepDeploymentAsset('pregame/portrait.png', selected), true);
  assert.equal(keepDeploymentAsset('sounds/skill.ogg', selected), true);
  assert.equal(
    keepDeploymentAsset('nam-de-dark-v1/effects.png', selected),
    true,
  );
});
test('stale, added, removed and failed loader inputs block pruning instead of silently dropping new art', () => {
  for (const inputs of [
    { 'loader.ts': 'b' },
    {},
    { 'loader.ts': 'a', 'new.json': 'c' },
  ])
    assert.throws(() => validateSelection(fixture, inputs), /stale/);
  assert.throws(
    () => validateSelection({ ...fixture, failures: ['404'] }, fixture.inputs),
    /Incomplete/,
  );
  assert.throws(
    () =>
      validateSelection(
        { ...fixture, paths: ['/assets/../outside.png'] },
        fixture.inputs,
      ),
    /Invalid/,
  );
});
