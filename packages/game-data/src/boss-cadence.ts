import { z } from 'zod';
import raw from './boss-cadence.json' with { type: 'json' };
const seconds = z.number().finite().min(0.05).max(300);
const attack = z.strictObject({
  windupSeconds: seconds,
  recoverySeconds: seconds,
  cooldownSeconds: seconds,
});
export const bossCadence = z
  .strictObject({
    note: z.string(),
    ly_mac_sau: z.strictObject({
      restSeconds: seconds,
      basicCooldownSeconds: seconds,
      attacks: z.record(z.string(), attack),
    }),
    hong_liet: z.strictObject({
      restSeconds: seconds,
      initialRestSeconds: seconds,
      abilities: z.record(
        z.string(),
        attack.extend({ intervalSeconds: seconds }),
      ),
    }),
    kim_luan: z.strictObject({
      restSeconds: seconds,
      abilities: z.record(
        z.string(),
        z.strictObject({
          warningSeconds: z.number().finite().min(0).max(300),
          cooldownSeconds: seconds,
        }),
      ),
    }),
    chu_ba_thong: z.strictObject({
      basicPalmSeconds: seconds,
      phasesSeconds: z.record(z.string(), seconds),
    }),
  })
  .parse(raw);
export const cadenceTicks = (seconds: number) =>
  Math.max(1, Math.round(seconds * 30));
