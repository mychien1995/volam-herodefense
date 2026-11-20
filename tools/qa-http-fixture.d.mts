import type { RequestListener, Server } from 'node:http';
import type { FixtureOwners } from './qa-fixture.mjs';
export function startQaHttpFixture(
  owned: FixtureOwners,
  identity: {
    port: number;
    runId: string;
    serverUrl: string;
    protocolVersion: number;
  },
  handler: RequestListener,
): Promise<Server>;
