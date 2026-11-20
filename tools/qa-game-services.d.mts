import type { InlineConfig } from 'vite';
import type { createGameServer } from '../apps/game-server/dist/app.config.js';
import type { QaSession } from './qa-session.mjs';
export interface OwnedGameOptions {
  config?: string;
  session?: QaSession;
  environment?: Record<string, string | undefined>;
  client?: InlineConfig;
  clientDist?: string;
  loadClientConfig?: boolean;
  clientMode?: 'development' | 'preview';
  serverFactory?: typeof createGameServer;
  configure?: (
    server: ReturnType<typeof createGameServer>,
    owned: { add(close: () => unknown): void },
  ) => InlineConfig | void | Promise<InlineConfig | void>;
}

export function startOwnedGameQa(
  options?: OwnedGameOptions,
): Promise<() => Promise<void>>;
