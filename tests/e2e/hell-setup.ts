import { readFileSync } from 'node:fs';
import { hellRoster } from '@volam/game-data';
import { setupDungeonArt } from './desert-setup.js';
export default async function setup() {
  const manifest = JSON.parse(
    readFileSync(
      new URL('../../assets/hell_dungeon.manifest.json', import.meta.url),
      'utf8',
    ),
  );
  return setupDungeonArt({
    prefix: 'hell',
    destination: 'hell',
    roster: hellRoster,
    serverPort: 2700,
    clientPort: 5300,
    actorStates: Object.fromEntries(
      manifest.assets.map(
        (a: { archetypeId: string; animations: Array<{ state: string }> }) => [
          a.archetypeId,
          [...new Set(a.animations.map((t) => t.state))],
        ],
      ),
    ),
  });
}
