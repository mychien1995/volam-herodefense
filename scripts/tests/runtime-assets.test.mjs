import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { prepareClientDelivery } from '../prepare-client-delivery.mjs';
import { runtimeDeliveryPlugin } from '../runtime-delivery-plugin.mjs';
import { stageRuntimeAssets } from '../stage-runtime-assets.mjs';
import {
  iisClientConfig,
  iisRasterConfigs,
  immutableAssetPattern,
} from '../iis-client-config.mjs';

test('delivery rasters preserve pixels, deduplicate, invalidate changed content and repair a corrupt conversion cache', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'volam-delivery-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = join(dir, 'source'),
    cache = join(dir, 'cache');
  mkdirSync(join(source, 'skills/test/frames'), { recursive: true });
  const python = (script, ...args) => {
    const result = spawnSync(
      process.env['PYTHON'] ?? 'python',
      ['-c', script, ...args],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr);
  };
  python(
    `from PIL import Image
import sys
im=Image.new('RGBA',(128,128),(73,88,123,255))
im.putpixel((0,0),(17,29,59,0))
im.save(sys.argv[1])
from PIL.PngImagePlugin import PngInfo
import struct
metadata=PngInfo();metadata.add(b'gAMA',struct.pack('!I',45455))
im.save(sys.argv[2],pnginfo=metadata)
metadata=PngInfo();metadata.add_text('note','same pixels, different PNG bytes')
im.save(sys.argv[3],pnginfo=metadata)`,
    join(source, 'body.png'),
    join(source, 'gamma.png'),
    join(source, 'metadata-variant.png'),
  );
  const original = readFileSync(join(source, 'body.png'));
  writeFileSync(join(source, 'duplicate.png'), original);
  writeFileSync(join(source, 'skills/test/frames/authoring.png'), original);
  writeFileSync(
    join(source, 'leaf.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>',
  );
  writeFileSync(join(source, 'atlas.json'), '{"frames":{}}');
  const first = stageRuntimeAssets(join(dir, 'first'), { source, cache });
  const url = first.aliases['/assets/body.png'];
  assert.match(url, /^\/assets\/immutable\/[a-f0-9]{64}\.webp$/);
  assert.equal(url, first.aliases['/assets/duplicate.png']);
  assert.equal(url, first.aliases['/assets/metadata-variant.png']);
  assert.equal(first.runtime.length, new Set(first.runtime).size);
  assert.equal(first.summary.webpFiles, 1);
  const svg = first.aliases['/assets/leaf.svg'];
  assert.match(svg, /^\/assets\/immutable\/[a-f0-9]{64}\.svg$/);
  assert.deepEqual(
    readFileSync(join(source, 'leaf.svg')),
    readFileSync(join(dir, 'first/runtime-public', svg)),
  );

  const gamma = first.aliases['/assets/gamma.png'];
  assert(gamma.endsWith('.png'));
  assert.deepEqual(
    readFileSync(join(source, 'gamma.png')),
    readFileSync(join(dir, 'first/runtime-public', gamma)),
  );
  assert(first.summary.deliveredRasterBytes < first.summary.uniquePngBytes);
  assert(!first.runtime.some((path) => path.includes('/frames/')));
  const delivered = join(dir, 'first/runtime-public', url);
  python(
    `from PIL import Image
import sys
assert Image.open(sys.argv[1]).convert('RGBA').tobytes()==Image.open(sys.argv[2]).convert('RGBA').tobytes()`,
    join(source, 'body.png'),
    delivered,
  );
  assert.deepEqual(readFileSync(join(source, 'body.png')), original);
  const digest = createHash('sha256').update(original).digest('hex');
  writeFileSync(join(cache, digest + '.webp'), 'corrupt');
  const repaired = stageRuntimeAssets(join(dir, 'repaired'), { source, cache });
  assert.equal(repaired.aliases['/assets/body.png'], url);
  python(
    `from PIL import Image
import sys
im=Image.open(sys.argv[1]);im.putpixel((1,1),(200,11,4,255));im.save(sys.argv[1])`,
    join(source, 'body.png'),
  );
  const next = stageRuntimeAssets(join(dir, 'next'), { source, cache });
  assert.notEqual(next.aliases['/assets/body.png'], url);
  assert.equal(next.aliases['/assets/duplicate.png'], url);
});

test('IIS caches only content-addressed requests, with mutable entrypoints and proxy excluded', () => {
  const immutable = new RegExp(immutableAssetPattern);
  assert(immutable.test('/bundles/game-CkN_oV22.js'));
  assert(immutable.test('/bundles/game-CkN_oV22.css'));
  assert(!immutable.test('/bundles/manifest.json'));
  const gzipRule = iisClientConfig().match(
    /<rule name="Volam precompressed text"[\s\S]*?<match url="([^"]+)"/,
  )[1];
  assert(new RegExp(gzipRule).test('bundles/game-CkN_oV22.js'));
  assert(!new RegExp(gzipRule).test('game-api/health.json'));

  assert(immutable.test('/assets/immutable/' + 'a'.repeat(64) + '.webp'));
  assert(immutable.test('/assets/immutable/' + 'b'.repeat(64) + '.png?v=1'));
  for (const path of [
    '/',
    '/index.html',
    '/volam-build-endpoint.json',
    '/assets/manifest.json',
    '/assets/body.png',
    '/assets/hero-reference.png',
    '/assets/game-CkN_oV22.js',
    '/game-api/health',
    '/game-api/assets/game-CkN_oV22.js',
  ])
    assert(!immutable.test(path), path);
  const maps = iisRasterConfigs({
    '/assets/a&b.png': '/assets/immutable/' + 'a'.repeat(64) + '.webp',
  });
  const xml = iisClientConfig();
  assert(maps['assets/web.config'].includes('a&amp;b.png'));
  assert(Buffer.byteLength(xml) < 250 * 1024);
  assert(xml.includes('{UNENCODED_URL}'));
  assert(xml.includes('cacheControlMaxAge="0.00:00:00"'));
  const parsed = spawnSync(
    process.env['PYTHON'] ?? 'python',
    [
      '-c',
      `import sys,xml.etree.ElementTree as E
r=E.fromstring(sys.stdin.read())
assert r.find('.//rewriteMaps') is None
assert r.find('.//urlCompression').get('doDynamicCompression')=='false'
assert r.find('.//mimeMap[@fileExtension=".webp"]').get('mimeType')=='image/webp'
assert r.find('.//outboundRules/rule/action').get('value')=='public, max-age=31536000, immutable'`,
    ],
    { input: xml, encoding: 'utf8' },
  );
  assert.equal(parsed.status, 0, parsed.stderr);
  const many = Object.fromEntries(
    Array.from({ length: 3000 }, (_, i) => [
      `/assets/family${i % 30}/image${i}.png`,
      '/assets/immutable/' + 'a'.repeat(64) + '.webp',
    ]),
  );
  const configs = Object.values(iisRasterConfigs(many));
  assert.equal(configs.length, 30);
  assert(configs.every((xml) => Buffer.byteLength(xml) < 250 * 1024));
});

test('gzip delivery roundtrips bytes and CSS uses content hashes without changing JSON atlas identities', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'volam-text-delivery-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'bundles'));
  mkdirSync(join(dir, 'assets'));
  const script = Buffer.from(
    'console.log("long repeated content");\n'.repeat(200),
  );
  writeFileSync(join(dir, 'bundles/game-CkN_oV22.js'), script);
  writeFileSync(join(dir, 'assets/body.png'), Buffer.from([1, 2, 3, 4]));
  const info = prepareClientDelivery(dir);
  assert.equal(info.gzipFiles, 1);
  assert(info.gzipBytes < info.originalBytes);
  assert.deepEqual(
    gunzipSync(readFileSync(join(dir, 'bundles/game-CkN_oV22.js.gz'))),
    script,
  );
  assert.equal(info.branch, 'fixture');
  const url = '/assets/immutable/' + 'a'.repeat(64) + '.webp';
  const plugin = runtimeDeliveryPlugin({
    runtimePublicDir: dir,
    aliases: { '/assets/body.png': url },
  });
  const css = plugin.transform(
    '.portrait{background:url("/assets/body.png")}',
    'school.css',
  );
  assert(css.includes(url));
  assert.equal(
    plugin.transform('{"url":"/assets/body.png"}', 'atlas.json'),
    undefined,
  );
});
