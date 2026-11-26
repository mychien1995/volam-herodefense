import { existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { immutableAssetPattern } from './iis-client-config.mjs';
import {
  compressible,
  deliveryMime,
  prepareClientDelivery,
} from './prepare-client-delivery.mjs';

export function runtimeDeliveryPlugin({ runtimePublicDir, aliases }) {
  let output, repo;
  return {
    name: 'volam-runtime-delivery',
    enforce: 'pre',
    configResolved(config) {
      output = resolve(config.root, config.build.outDir);
      repo = resolve(config.root, '../..');
    },
    transform(code, id) {
      if (!runtimePublicDir || !id.split('?')[0].endsWith('.css')) return;
      return code.replace(
        /url\(\s*(['"]?)(\/assets\/[^'"\s)]+)\1\s*\)/g,
        (whole, _quote, url) =>
          aliases[url] ? `url("${aliases[url]}")` : whole,
      );
    },
    closeBundle() {
      if (runtimePublicDir) prepareClientDelivery(output, { repo });
    },
    configurePreviewServer(server) {
      if (!runtimePublicDir) return;
      const immutable = new RegExp(immutableAssetPattern);
      server.middlewares.use((request, response, next) => {
        const original = request.url ?? '/';
        const url = new URL(original, 'http://localhost');
        const canonical = aliases[url.pathname];
        if (canonical) request.url = canonical + url.search;
        let gzipType;
        const accepts = request.headers['accept-encoding'] ?? '';
        if (
          compressible.test(url.pathname.slice(1)) &&
          /\bgzip\b/.test(accepts) &&
          !/(?:^|,)\s*gzip\s*;\s*q=0(?:\.0*)?\s*(?:,|$)/.test(accepts) &&
          existsSync(resolve(output, '.' + url.pathname + '.gz'))
        ) {
          request.url = url.pathname + '.gz' + url.search;
          gzipType = deliveryMime[extname(url.pathname)];
        }
        if (
          url.pathname === '/' ||
          url.pathname.endsWith('.html') ||
          url.pathname.startsWith('/assets/') ||
          url.pathname.startsWith('/bundles/') ||
          url.pathname.startsWith('/volam-build-')
        ) {
          const writeHead = response.writeHead.bind(response);
          response.writeHead = function (status, messageOrHeaders, headers) {
            this.setHeader(
              'Cache-Control',
              immutable.test(original) && [200, 304].includes(status)
                ? 'public, max-age=31536000, immutable'
                : 'max-age=0, must-revalidate',
            );
            if (compressible.test(url.pathname.slice(1)))
              this.setHeader('Vary', 'Accept-Encoding');
            if (gzipType) {
              this.setHeader('Content-Type', gzipType);
              this.setHeader('Content-Encoding', 'gzip');
              this.setHeader('Vary', 'Accept-Encoding');
            }
            return typeof messageOrHeaders === 'string'
              ? writeHead(status, messageOrHeaders, headers)
              : writeHead(status, messageOrHeaders);
          };
        }
        next();
      });
    },
  };
}
