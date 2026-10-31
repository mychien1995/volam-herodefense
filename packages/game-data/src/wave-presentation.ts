import { z } from 'zod';
import raw from './arena-wave-names.json' with { type: 'json' };
/** Names follow the same retained wave manifest as the actual rendered creeps. */
export const arenaWaveNames = z
  .array(
    z.strictObject({
      wave: z.number().int().positive(),
      nameVi: z.string().min(1),
    }),
  )
  .parse(raw);
export const invasionCreepName = (wave: number): string =>
  arenaWaveNames.find((a) => a.wave === wave)?.nameVi ?? '';
