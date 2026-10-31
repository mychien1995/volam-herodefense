import { readFileSync } from 'node:fs';
import { beachRoster } from '@volam/game-data';
import { setupDungeonArt } from './desert-setup.js';
export default async function setup() {
  const manifest = JSON.parse(
    readFileSync(
      new URL('../../assets/beach_dungeon.manifest.json', import.meta.url),
      'utf8',
    ),
  );
  return setupDungeonArt({
    prefix: 'beach',
    destination: 'sea',
    roster: beachRoster,
    serverPort: 2698,
    clientPort: 5298,
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
