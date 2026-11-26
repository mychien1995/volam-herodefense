import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, posix, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const escapeXml = (value) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[c],
  );

/** Match the original request, never the internal PNG -> delivery-copy rewrite. */
export const immutableAssetPattern =
  '^/(?:assets/immutable/[a-f0-9]{64}\\.(?:png|webp|svg)|bundles/[^/?]+-[A-Za-z0-9_-]{8,}\\.[a-z0-9]+)(?:\\?.*)?$';

export function iisRasterConfigs(aliases) {
  const folders = new Map();
  for (const [from, to] of Object.entries(aliases)) {
    const folder = posix.dirname(from);
    if (!folders.has(folder)) folders.set(folder, []);
    folders.get(folder).push([posix.basename(from), to]);
  }
  return Object.fromEntries(
    [...folders].map(([folder, entries]) => {
      const id = createHash('sha256').update(folder).digest('hex');
      const name = 'VolamRaster_' + id;
      const xml = `<configuration><system.webServer><rewrite>
  <rewriteMaps><rewriteMap name="${name}" defaultValue="">
${entries.map(([from, to]) => `    <add key="${escapeXml(from)}" value="${escapeXml(to)}" />`).join('\n')}
  </rewriteMap></rewriteMaps>
  <rules><rule name="${name}" stopProcessing="true">
    <match url="^([^/]+\\.(?:png|svg))$" />
    <conditions><add input="{${name}:{R:1}}" pattern="^(.+)$" /></conditions>
    <action type="Rewrite" url="{C:1}" />
  </rule></rules>
</rewrite></system.webServer></configuration>\n`;
      // IIS applies its file-size limit to configSource files as well as web.config.
      if (Buffer.byteLength(xml) >= 250 * 1024)
        throw Error('IIS raster map exceeds the config limit: ' + folder);
      return [folder.slice(1) + '/web.config', xml];
    }),
  );
}

export function iisClientConfig() {
  const types = {
    js: 'application/javascript',
    css: 'text/css',
    json: 'application/json',
    tmj: 'application/json',
    svg: 'image/svg+xml',
  };
  const typeRules = Object.entries(types)
    .map(
      ([ext, mime]) =>
        `<rule name="Volam gzip ${ext} MIME" preCondition="Volam gzip ${ext}"><match serverVariable="RESPONSE_Content_Type" pattern=".*"/><action type="Rewrite" value="${mime}"/></rule>`,
    )
    .join('\n');
  const typeConditions = Object.keys(types)
    .map(
      (ext) =>
        `<preCondition name="Volam gzip ${ext}"><add input="{RESPONSE_Content_Type}" pattern="^application/gzip(?:;.*)?$"/><add input="{UNENCODED_URL}" pattern="\\.${ext}(?:\\?.*)?$"/></preCondition>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <defaultDocument enabled="true">
      <files><remove value="index.html" /><add value="index.html" /></files>
    </defaultDocument>
    <staticContent>
      <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="0.00:00:00" cacheControlCustom="must-revalidate" />
      <remove fileExtension=".json" /><mimeMap fileExtension=".json" mimeType="application/json" />
      <remove fileExtension=".tmj" /><mimeMap fileExtension=".tmj" mimeType="application/json" />
      <remove fileExtension=".webp" /><mimeMap fileExtension=".webp" mimeType="image/webp" />
      <remove fileExtension=".svg" /><mimeMap fileExtension=".svg" mimeType="image/svg+xml" />
      <remove fileExtension=".gz" /><mimeMap fileExtension=".gz" mimeType="application/gzip" />
      <remove fileExtension=".ogg" /><mimeMap fileExtension=".ogg" mimeType="audio/ogg" />
      <remove fileExtension=".mp3" /><mimeMap fileExtension=".mp3" mimeType="audio/mpeg" />
      <remove fileExtension=".wav" /><mimeMap fileExtension=".wav" mimeType="audio/wav" />
    </staticContent>
    <urlCompression doStaticCompression="false" doDynamicCompression="false" />
    <rewrite>
      <rules>
        <rule name="Volam precompressed text" stopProcessing="true">
          <match url="^(?:assets|bundles)/.*\\.(?:js|css|json|tmj|svg)$" />
          <conditions logicalGrouping="MatchAll">
            <add input="{HTTP_ACCEPT_ENCODING}" pattern="(^|,)\\s*gzip(?:\\s*;[^,]*)?(?:\\s*,|\\s*$)" />
            <add input="{HTTP_ACCEPT_ENCODING}" pattern="(^|,)\\s*gzip\\s*;\\s*q=0(?:\\.0*)?\\s*(?:,|$)" negate="true" />
            <add input="{REQUEST_FILENAME}.gz" matchType="IsFile" />
          </conditions>
          <action type="Rewrite" url="{R:0}.gz" />
        </rule>
        <rule name="Volam game server" stopProcessing="true">
          <match url="^game-api/(.*)$" />
          <action type="Rewrite" url="http://127.0.0.1:2567/{R:1}" appendQueryString="true" />
        </rule>
      </rules>
      <outboundRules>
        <rule name="Volam immutable assets" preCondition="Volam versioned request">
          <match serverVariable="RESPONSE_Cache_Control" pattern=".*" />
          <action type="Rewrite" value="public, max-age=31536000, immutable" />
        </rule>
        <rule name="Volam gzip encoding" preCondition="Volam gzip response"><match serverVariable="RESPONSE_Content_Encoding" pattern=".*"/><action type="Rewrite" value="gzip"/></rule>
        <rule name="Volam text Vary empty" preCondition="Volam text request"><match serverVariable="RESPONSE_Vary" pattern="^$"/><action type="Rewrite" value="Accept-Encoding"/></rule>
        <rule name="Volam text Vary append" preCondition="Volam text request"><match serverVariable="RESPONSE_Vary" pattern="^(?!.*Accept-Encoding)(.+)$"/><action type="Rewrite" value="{R:1}, Accept-Encoding"/></rule>
        ${typeRules}
        <preConditions>
          <preCondition name="Volam text request"><add input="{UNENCODED_URL}" pattern="^/(?:assets|bundles)/.*\\.(?:js|css|json|tmj|svg)(?:\\?.*)?$"/></preCondition>
          <preCondition name="Volam gzip response"><add input="{RESPONSE_Content_Type}" pattern="^application/gzip(?:;.*)?$"/></preCondition>
          ${typeConditions}
          <preCondition name="Volam versioned request">
            <add input="{UNENCODED_URL}" pattern="${escapeXml(immutableAssetPattern)}" />
            <add input="{RESPONSE_STATUS}" pattern="^(200|304)$" />
          </preCondition>
        </preConditions>
      </outboundRules>
    </rewrite>
  </system.webServer>
</configuration>
`;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const stage = resolve(process.argv[2]);
  const { aliases } = JSON.parse(
    readFileSync(resolve(stage, 'runtime-assets.json'), 'utf8'),
  );
  const client = process.argv[3]
    ? resolve(process.argv[3])
    : resolve(stage, 'client');
  mkdirSync(client, { recursive: true });
  writeFileSync(resolve(client, 'web.config'), iisClientConfig());
  for (const [path, xml] of Object.entries(iisRasterConfigs(aliases))) {
    const target = resolve(client, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, xml);
  }
}
