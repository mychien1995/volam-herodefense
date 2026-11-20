import {
  mkdtempSync,
  mkdirSync,
  realpathSync,
  rmSync,
  readFileSync,
} from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileSnapshot } from './core-test-cache.mjs';
import { profileSync } from './qa-cost-profile.mjs';

/** Private production output, owned by one batch; reuse only after fresh output byte verification. */
export class QaPreviewBuild {
  constructor(root, serverUrl, build, observe) {
    this.root = resolve(root);
    this.serverUrl = serverUrl;
    this.build = build;
    this.observe = observe;
  }
  ensureDirectory() {
    if (!this.directory) {
      const cache = resolve(this.root, '.cache');
      mkdirSync(cache, { recursive: true });
      if (dirname(realpathSync(cache)) !== realpathSync(this.root))
        throw Error('QA preview cache escapes workspace');
      this.directory = mkdtempSync(resolve(cache, 'qa-iteration-preview-'));
    }
    return this.directory;
  }
  validateDirectory() {
    const actual = realpathSync(this.directory),
      parent = realpathSync(resolve(this.root, '.cache'));
    if (
      dirname(actual) !== parent ||
      !basename(actual).startsWith('qa-iteration-preview-')
    )
      throw Error('Unexpected owned preview output path');
  }
  snapshot() {
    this.validateDirectory();
    const snapshot = () => fileSnapshot(this.directory, ['.']).digest;
    if (!this.observe) return snapshot();
    const { value, cost } = profileSync(snapshot, this.directory);
    this.observe({ kind: 'preview-output', ...cost });
    return value;
  }
  verifyEndpoint() {
    const endpoint = JSON.parse(
      readFileSync(
        resolve(this.directory, 'volam-build-endpoint.json'),
        'utf8',
      ),
    );
    if (endpoint.serverUrl !== this.serverUrl)
      throw Error('Owned preview build endpoint mismatch');
  }
  async ensure(input) {
    this.ensureDirectory();
    this.validateDirectory();
    const before = performance.now();
    if (this.receipt?.input === input) {
      const output = this.snapshot();
      if (output === this.receipt.output) {
        this.verifyEndpoint();
        return {
          directory: this.directory,
          output,
          reused: true,
          seconds: (performance.now() - before) / 1000,
        };
      }
    }
    this.receipt = undefined;
    await this.build(this.directory);
    this.verifyEndpoint();
    const output = this.snapshot();
    this.receipt = { input, output };
    return {
      directory: this.directory,
      output,
      reused: false,
      seconds: (performance.now() - before) / 1000,
    };
  }
  async close() {
    if (!this.directory) return;
    this.validateDirectory();
    rmSync(this.directory, { recursive: true, force: true });
    this.directory = undefined;
    this.receipt = undefined;
  }
}
