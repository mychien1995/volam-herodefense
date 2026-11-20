/** Switch only the isolated review room, never a production room. */
import { readFileSync } from 'node:fs';
const session = JSON.parse(
  readFileSync('.cache/presentation-boss-play-session.json', 'utf8'),
);
const player = JSON.parse(
  readFileSync('.cache/presentation-boss-play-player.json', 'utf8'),
);
const id = process.argv[2];
if (!id) throw Error('Usage: node tools/set-boss-review.mjs bac_cai');
const response = await fetch(session.clientUrl + '/__boss-review', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-review-run': session.runId,
  },
  body: JSON.stringify({ roomId: player.roomId, id }),
});
if (!response.ok) throw Error(await response.text());
console.log(await response.text());
