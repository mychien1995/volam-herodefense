param([string]$ArchiveName = 'volam-hero-defense-windows-iis.zip')

$ErrorActionPreference = 'Stop'
if ([IO.Path]::GetFileName($ArchiveName) -cne $ArchiveName -or !$ArchiveName.EndsWith('.zip')) {
    throw 'ArchiveName must be a ZIP filename inside artifacts.'
}

function Invoke-Checked {
    param([string]$File, [string[]]$Arguments)

    & $File @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$File exited with code $LASTEXITCODE."
    }
}

function Invoke-Pnpm {
    param([string[]]$Arguments)

    if ($pnpm) {
        Invoke-Checked $pnpm.Source $Arguments
    } else {
        Invoke-Checked $npm.Source (@('exec', '--yes', "--package=$packageManager", '--', 'pnpm') + $Arguments)
    }
}

$repo = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$gameHost = 'hero-defense.stackfolio.cloud'
$gameUrl = "https://$gameHost"
$packageManager = (Get-Content -LiteralPath (Join-Path $repo 'package.json') -Raw | ConvertFrom-Json).packageManager
$node = Get-Command node.exe -ErrorAction Stop
$python = Get-Command python.exe -ErrorAction Stop
$tar = Get-Command tar.exe -ErrorAction Stop
$pnpm = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
if (!$pnpm) {
    $npm = Get-Command npm.cmd -ErrorAction Stop
}

$artifactDir = Join-Path $repo 'artifacts'
$stage = Join-Path $artifactDir ('.iis-build-' + [Guid]::NewGuid().ToString('N'))
$archive = Join-Path $artifactDir $ArchiveName
$client = Join-Path $stage 'client'
$server = Join-Path $stage 'server'
$previousEndpoint = [Environment]::GetEnvironmentVariable('VITE_SERVER_URL', 'Process')
$previousPublicDir = [Environment]::GetEnvironmentVariable('VOLAM_RUNTIME_PUBLIC_DIR', 'Process')

Push-Location -LiteralPath $repo
try {
    & $python.Source -c 'import PIL'
    if ($LASTEXITCODE -ne 0) {
        throw 'Asset preparation requires Pillow. Install it with python -m pip install Pillow.'
    }
    New-Item -ItemType Directory -Path $stage | Out-Null
    Write-Host 'Installing locked build dependencies...'
    Invoke-Pnpm @('install', '--frozen-lockfile', '--prefer-offline', '--prod=false')

    Write-Host "Building game for $gameUrl..."
    $env:VITE_SERVER_URL = "$gameUrl/game-api"
    Invoke-Pnpm @('assets:prepare')
    Write-Host 'Checking audited production atlas selection against current sources...'
    Invoke-Checked $node.Source @('tools/audit-deploy-assets.mjs', '--check')
    Invoke-Checked $node.Source @('scripts/stage-runtime-assets.mjs', $stage)
    $env:VOLAM_RUNTIME_PUBLIC_DIR = Join-Path $stage 'runtime-public'
    Invoke-Pnpm @('exec', 'tsc', '-b')
    Invoke-Pnpm @('--filter', '@volam/game-client', 'build', '--outDir', $client)

    $builtEndpoint = (Get-Content -LiteralPath (Join-Path $client 'volam-build-endpoint.json') -Raw | ConvertFrom-Json).serverUrl
    if ($builtEndpoint -cne $env:VITE_SERVER_URL) {
        throw "Unexpected endpoint in client build: $builtEndpoint"
    }
    $gameEntry = Join-Path $client 'index.html'
    if (!(Test-Path -LiteralPath $gameEntry -PathType Leaf)) {
        throw 'The client build is missing index.html.'
    }
    foreach ($page in Get-ChildItem -LiteralPath $client -Filter '*.html' -File -Recurse -Force) {
        if ($page.FullName -ne $gameEntry) {
            Remove-Item -LiteralPath $page.FullName
        }
    }

    Write-Host 'Copying compiled server and locked runtime dependencies...'
    # Materialize pnpm's installed graph as ordinary folders. Windows junctions
    # point into the build machine, so they cannot travel with the archive.
    $copyRuntime = @'
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, resolve, sep } from 'node:path';

const sourceServer = resolve('apps/game-server');
const targetServer = resolve(process.argv[2]);
const graph = new Map();

function readManifest(directory) {
  return JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
}

function locatePackage(directory, name) {
  const require = createRequire(join(directory, 'package.json'));
  const found = require.resolve.paths(name)
    ?.map((parent) => join(parent, name))
    .find((candidate) => existsSync(join(candidate, 'package.json')));
  assert(found, `Cannot resolve ${name} from ${directory}`);
  return realpathSync(found);
}

function collectDependencies(directory) {
  if (graph.has(directory)) return;
  const manifest = readManifest(directory);
  const requiredPeers = Object.keys(manifest.peerDependencies ?? {})
    .filter((name) => !manifest.peerDependenciesMeta?.[name]?.optional);
  const names = new Set([...Object.keys(manifest.dependencies ?? {}), ...requiredPeers]);
  const dependencies = new Map([...names].map((name) => [name, locatePackage(directory, name)]));
  graph.set(directory, dependencies);
  for (const source of dependencies.values()) collectDependencies(source);
}

function copyCompiled(source, target) {
  cpSync(join(source, 'dist'), join(target, 'dist'), {
    recursive: true,
    filter: (path) => !/\.map$|\.d\.ts$/.test(path),
  });
}

collectDependencies(sourceServer);
const rootModules = new Map(graph.get(sourceServer));
for (const dependencies of graph.values()) {
  for (const [name, source] of dependencies) {
    if (!rootModules.has(name)) rootModules.set(name, source);
  }
}

mkdirSync(targetServer);
writeFileSync(join(targetServer, 'package.json'), '{"private":true,"type":"module"}\n');
copyCompiled(sourceServer, targetServer);

const installed = new Map();
function copyPackage(name, source, parent, ancestors = new Set()) {
  assert(!ancestors.has(source), `Cannot place conflicting circular dependency ${name}`);
  const target = join(parent, 'node_modules', name);
  mkdirSync(target, { recursive: true });
  installed.set(realpathSync(target), source);

  if (name.startsWith('@volam/')) {
    copyCompiled(source, target);
    cpSync(join(source, 'package.json'), join(target, 'package.json'));
  } else {
    cpSync(source, target, {
      recursive: true,
      dereference: true,
      filter: (path) => !relative(source, path).split(sep).includes('node_modules'),
    });
  }

  // Keep a different locked version inside the package that needs it.
  for (const [dependency, requiredSource] of graph.get(source)) {
    if (rootModules.get(dependency) !== requiredSource) {
      copyPackage(dependency, requiredSource, target, new Set([...ancestors, source]));
    }
  }
}

for (const [name, source] of rootModules) copyPackage(name, source, targetServer);
for (const [target, source] of [[targetServer, sourceServer], ...installed]) {
  for (const [name, expected] of graph.get(source)) {
    assert.equal(installed.get(locatePackage(target, name)), expected, `Wrong resolution for ${name} in ${target}`);
  }
}
console.log(`Verified ${installed.size} runtime packages against the installed dependency graph.`);
'@
    $copyRuntime | & $node.Source --input-type=module - $server
    if ($LASTEXITCODE -ne 0) {
        throw "Server packaging failed with exit code $LASTEXITCODE."
    }

    $iisConfig = @'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <defaultDocument enabled="true">
      <files>
        <remove value="index.html" />
        <add value="index.html" />
      </files>
    </defaultDocument>
    <staticContent>
      <remove fileExtension=".json" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <remove fileExtension=".tmj" />
      <mimeMap fileExtension=".tmj" mimeType="application/json" />
      <remove fileExtension=".ogg" />
      <mimeMap fileExtension=".ogg" mimeType="audio/ogg" />
      <remove fileExtension=".mp3" />
      <mimeMap fileExtension=".mp3" mimeType="audio/mpeg" />
      <remove fileExtension=".wav" />
      <mimeMap fileExtension=".wav" mimeType="audio/wav" />
    </staticContent>
    <rewrite>
__VOLAM_RASTER_MAP__
      <rules>
        <rule name="Volam canonical raster" stopProcessing="true">
          <match url="^assets/.*\.png$" />
          <conditions>
            <add input="{VolamRasterAliases:{R:0}}" pattern="^(.+)$" />
          </conditions>
          <action type="Rewrite" url="{C:1}" />
        </rule>
        <rule name="Volam game server" stopProcessing="true">
          <match url="^game-api/(.*)$" />
          <action type="Rewrite" url="http://127.0.0.1:2567/{R:1}" appendQueryString="true" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
'@
    $iisConfig.Replace('__VOLAM_RASTER_MAP__', (Get-Content -LiteralPath (Join-Path $stage 'runtime-assets-iis.xml') -Raw)) |
        Set-Content -LiteralPath (Join-Path $client 'web.config') -Encoding UTF8

    @'
@echo off
setlocal
cd /d "%~dp0"
set "NODE_ENV=production"
set "PORT=2567"
node dist\index.js
exit /b %errorlevel%
'@ | Set-Content -LiteralPath (Join-Path $server 'start-server.cmd') -Encoding Ascii

    @"
Vo Lam Hero Defense on Windows IIS

1. Install Node.js 24 LTS on the VPS and put node.exe on PATH.
2. Extract the ZIP. Keep the server folder outside the IIS site root.
3. Run server\start-server.cmd and check http://127.0.0.1:2567/health.
4. Enable IIS Static Content, WebSocket Protocol, URL Rewrite and ARR proxy.
5. Point the IIS site root to the client folder. Bind HTTPS on port 443 to $gameHost with a valid TLS certificate.
6. Check $gameUrl/game-api/health and join the same room from two browsers.
7. Allow public TCP 443 and keep TCP 2567 private. Use a Windows startup task
   to run server\start-server.cmd across reboots.
"@ | Set-Content -LiteralPath (Join-Path $stage 'DEPLOY.txt') -Encoding Ascii

    Write-Host 'Creating deployment ZIP...'
    $stagedArchive = Join-Path $stage 'release.zip'
    Invoke-Checked $tar.Source @('-a', '-cf', $stagedArchive, '-C', $stage, 'client', 'server', 'DEPLOY.txt')
    Move-Item -LiteralPath $stagedArchive -Destination $archive -Force
    Copy-Item -LiteralPath (Join-Path $stage 'runtime-assets.json') -Destination ($archive + '.assets.json')
    Write-Host "Deployment ZIP: $archive"
} finally {
    [Environment]::SetEnvironmentVariable('VITE_SERVER_URL', $previousEndpoint, 'Process')
    [Environment]::SetEnvironmentVariable('VOLAM_RUNTIME_PUBLIC_DIR', $previousPublicDir, 'Process')
    Pop-Location
    if (Test-Path -LiteralPath $stage) {
        $resolvedStage = (Resolve-Path -LiteralPath $stage).Path
        $artifactPrefix = (Join-Path (Resolve-Path -LiteralPath $artifactDir).Path '.iis-build-')
        if ($resolvedStage.StartsWith($artifactPrefix, [StringComparison]::OrdinalIgnoreCase) -and
            $resolvedStage.StartsWith($repo + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
            try {
                Remove-Item -LiteralPath $resolvedStage -Recurse -Force
            } catch {
                Write-Warning "Could not remove temporary build folder: $resolvedStage"
            }
        }
    }
}
