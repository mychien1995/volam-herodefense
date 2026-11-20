import fs from 'node:fs';
import crypto from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let installed = false;
const bytes = (value, encoding) =>
  typeof value === 'string'
    ? Buffer.byteLength(
        value,
        typeof encoding === 'string'
          ? encoding
          : (encoding?.encoding ?? 'utf8'),
      )
    : (value?.byteLength ?? 0);
const usage = () => ({
  cpu: process.cpuUsage(),
  resource: process.resourceUsage(),
});
export function costPoint() {
  return { time: performance.now(), ...usage() };
}
export function costSince(before) {
  const after = usage();
  return {
    wallMilliseconds: performance.now() - before.time,
    cpuMilliseconds:
      (after.cpu.user -
        before.cpu.user +
        (after.cpu.system - before.cpu.system)) /
      1000,
    userCpuMilliseconds: (after.cpu.user - before.cpu.user) / 1000,
    systemCpuMilliseconds: (after.cpu.system - before.cpu.system) / 1000,
    fsRead: after.resource.fsRead - before.resource.fsRead,
    fsWrite: after.resource.fsWrite - before.resource.fsWrite,
    voluntaryContextSwitches:
      after.resource.voluntaryContextSwitches -
      before.resource.voluntaryContextSwitches,
    involuntaryContextSwitches:
      after.resource.involuntaryContextSwitches -
      before.resource.involuntaryContextSwitches,
    maxRssKiB: after.resource.maxRSS,
  };
}

/** Opt-in synchronous observer. Calls the original functions; never caches bytes or changes a digest. */
export function beginSyncCostProfile(root) {
  if (installed) throw Error('Nested sync cost profiles are unsupported');
  installed = true;
  const start = costPoint(),
    saved = [],
    groups = new Map();
  let stopped;
  const group = (method, path) => {
    let name = '[other]';
    if (typeof path === 'string' || path instanceof URL) {
      const local = relative(
        root,
        resolve(path instanceof URL ? fileURLToPath(path) : path),
      ).replaceAll('\\', '/');
      name =
        local.startsWith('../') || /^[A-Z]:/i.test(local)
          ? '[external]'
          : local.startsWith('apps/game-client/public/assets/')
            ? local.split('/').slice(0, 5).join('/')
            : local.split('/').slice(0, 3).join('/');
    }
    const key = method + ':' + name;
    if (!groups.has(key))
      groups.set(key, {
        method,
        group: name,
        calls: 0,
        bytes: 0,
        milliseconds: 0,
        failures: 0,
      });
    return groups.get(key);
  };
  function patch(object, key, wrapper) {
    const original = object[key];
    saved.push(() => {
      object[key] = original;
    });
    object[key] = wrapper(original);
  }
  for (const method of [
    'readFileSync',
    'writeFileSync',
    'copyFileSync',
    'statSync',
    'lstatSync',
    'readdirSync',
    'existsSync',
  ]) {
    patch(
      fs,
      method,
      (original) =>
        function (...args) {
          const record = group(method, args[0]),
            t = performance.now();
          record.calls++;
          try {
            const value = Reflect.apply(original, this, args);
            if (method === 'readFileSync')
              record.bytes += bytes(value, args[1]);
            if (method === 'writeFileSync')
              record.bytes += bytes(args[1], args[2]);
            return value;
          } catch (error) {
            record.failures++;
            throw error;
          } finally {
            record.milliseconds += performance.now() - t;
          }
        },
    );
  }
  const hashes = {
    created: 0,
    bytes: 0,
    updateMilliseconds: 0,
    digestMilliseconds: 0,
  };
  patch(
    crypto,
    'createHash',
    (original) =>
      function (...args) {
        const hash = Reflect.apply(original, this, args);
        hashes.created++;
        const update = hash.update,
          digest = hash.digest;
        hash.update = function (...params) {
          const t = performance.now();
          try {
            hashes.bytes += bytes(params[0], params[1]);
            return Reflect.apply(update, this, params);
          } finally {
            hashes.updateMilliseconds += performance.now() - t;
          }
        };
        hash.digest = function (...params) {
          const t = performance.now();
          try {
            return Reflect.apply(digest, this, params);
          } finally {
            hashes.digestMilliseconds += performance.now() - t;
          }
        };
        return hash;
      },
  );
  syncBuiltinESMExports();
  return {
    stop() {
      if (stopped) return stopped;
      for (const restore of saved.reverse()) restore();
      syncBuiltinESMExports();
      installed = false;
      const rows = [...groups.values()].sort(
        (a, b) => b.milliseconds - a.milliseconds,
      );
      stopped = {
        ...costSince(start),
        hashes,
        io: rows,
        totals: rows.reduce(
          (total, row) => {
            total.calls += row.calls;
            total.bytes += row.bytes;
            total.milliseconds += row.milliseconds;
            return total;
          },
          { calls: 0, bytes: 0, milliseconds: 0 },
        ),
        limits:
          'Synchronous fs/crypto observations overlap CPU/wall time; fs times include scheduling wait. Resource counters depend on platform. No attribution to a disk, antivirus or another process.',
      };
      return stopped;
    },
  };
}

export function profileSync(action, root) {
  const profile = beginSyncCostProfile(root);
  try {
    const value = action();
    if (value?.then) throw Error('profileSync requires a synchronous action');
    return { value, cost: profile.stop() };
  } finally {
    profile.stop();
  }
}
