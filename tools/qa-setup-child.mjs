import { loadConfigFromFile } from 'vite';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  realpathSync,
} from 'node:fs';
import { resolve, dirname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { qaSession } from './qa-session.mjs';
import { serveQaChild } from './qa-children.mjs';
import { PROTOCOL_VERSION } from '@volam/game-protocol';

const target = realpathSync(resolve(process.argv[2]));
if (!target.startsWith(realpathSync(resolve('tests/e2e')) + sep))
  throw Error('QA child setup must stay under tests/e2e');
const session = qaSession({
  profile: 'owned-setup-child',
  serverPort: Number(process.env.VOLAM_QA_CHILD_SERVER_PORT),
  clientPort: Number(process.env.VOLAM_QA_CHILD_CLIENT_PORT),
});
await serveQaChild(session, PROTOCOL_VERSION, async () => {
  mkdirSync(resolve('.cache'), { recursive: true });
  const cache = realpathSync(resolve('.cache'));
  if (!cache.startsWith(realpathSync(resolve('.')) + sep))
    throw Error('QA cache escapes workspace');
  const directory = mkdtempSync(resolve(cache, 'qa-setup-child-'));
  const remove = () => {
    if (
      dirname(directory) !== cache ||
      !directory.startsWith(resolve(cache, 'qa-setup-child-'))
    )
      throw Error('Unexpected owned QA temp path');
    rmSync(directory, { recursive: true, force: true });
  };
  try {
    const wrapper = resolve(directory, 'setup.config.mjs');
    writeFileSync(
      wrapper,
      `import setup from ${JSON.stringify(pathToFileURL(target).href)}; export default async()=>({qaCleanup:await setup()});`,
    );
    const loaded = await loadConfigFromFile({}, wrapper, undefined, 'silent');
    const cleanup = loaded?.config?.qaCleanup;
    if (typeof cleanup !== 'function')
      throw Error('QA setup did not return an owned cleanup');
    return async () => {
      try {
        await cleanup();
      } finally {
        remove();
      }
    };
  } catch (error) {
    remove();
    throw error;
  }
});
