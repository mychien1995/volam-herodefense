import { startGameQa } from './global-setup.js';
import { StandaloneLoiDaiRoom } from '../../apps/game-server/dist/rooms/StandaloneLoiDaiRoom.js';
import { mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
export default async function setup() {
  const dir = join(
    'docs/evidence/sessions',
    process.env['VOLAM_QA_SESSION'] ?? 'pvp-repair',
    'pvp-repair',
  );
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'server-lifecycle.ndjson');
  return startGameQa(() => {
    const proto = StandaloneLoiDaiRoom.prototype;
    const originals = new Map<string, PropertyDescriptor>();
    const signatures = new WeakMap<StandaloneLoiDaiRoom, string>();
    for (const method of ['onJoin', 'onDrop', 'onLeave', 'syncState']) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, method)!;
      originals.set(method, descriptor);
      Object.defineProperty(proto, method, {
        ...descriptor,
        value: function (this: StandaloneLoiDaiRoom, ...args: unknown[]) {
          const record = (stage: string) => {
            const self = args[0] as { sessionId?: string } | undefined;
            const data = {
              room: this.roomId,
              event: method,
              stage,
              session: method === 'syncState' ? undefined : self?.sessionId,
              code: args[1],
              phase: this.pvp.phase,
              map: this.pvp.mapId,
              members: [...this.pvp.members.keys()],
              players: [...this.state.players.keys()],
              clients: Array.from(this.clients, (c) => ({
                id: c.sessionId,
                visible: [...this.state.players]
                  .filter(([, p]) => c.view?.has(p))
                  .map(([id]) => id),
              })),
            };
            const signature = JSON.stringify({
              ...data,
              event: undefined,
              stage: undefined,
              session: undefined,
              code: undefined,
            });
            if (method !== 'syncState' || signature !== signatures.get(this)) {
              signatures.set(this, signature);
              appendFileSync(
                path,
                JSON.stringify({
                  ...data,
                  tick: this.pvp.tick,
                  at: Date.now(),
                }) + '\n',
              );
            }
          };
          if (method === 'onJoin') {
            const client = args[0] as { sessionId: string; ref: any };
            const socket = client.ref;
            let pongAt = Date.now();
            const write = (
              event: string,
              extra: Record<string, unknown> = {},
            ) =>
              appendFileSync(
                path,
                JSON.stringify({
                  event,
                  room: this.roomId,
                  session: client.sessionId,
                  at: Date.now(),
                  pingCount: socket.pingCount,
                  pongAge: Date.now() - pongAt,
                  ...extra,
                }) + '\n',
              );
            socket.on('pong', () => {
              const gap = Date.now() - pongAt;
              if (gap > 6000) write('socket-late-pong', { gap });
              pongAt = Date.now();
            });
            socket.on('error', (error: Error & { code?: string }) =>
              write('socket-error', {
                message: error.message,
                code: error.code,
              }),
            );
            socket.on('close', (code: number, reason: Buffer) =>
              write('socket-close', { code, reason: reason.toString() }),
            );
            const terminate = socket.terminate;
            socket.terminate = function (...params: unknown[]) {
              write('socket-terminate', { stack: new Error().stack });
              return Reflect.apply(terminate, this, params);
            };
          }
          if (method !== 'syncState') record('before');
          try {
            return Reflect.apply(descriptor.value, this, args);
          } finally {
            record('after');
          }
        },
      });
    }
    return () => {
      for (const [name, descriptor] of originals)
        Object.defineProperty(proto, name, descriptor);
    };
  });
}
