import type { RenovationReady } from '../../tools/verify-renovation-runtime.mjs';
export function verifyDepthExpansion(
  context: RenovationReady & { onZone?: (context: any) => Promise<void> },
): Promise<object>;
