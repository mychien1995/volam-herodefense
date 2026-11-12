import Phaser from 'phaser';
import { setArtFilter } from './art-filter.js';
import manifest from './approved-art.generated.json';
import renovatedSkills from './renovation-skills.generated.json';
import {
  assets as allSkills,
  atlases as actionAtlases,
  inlineAtlases as actionInlineAtlases,
} from './renovation-actions.generated.json';
import {
  retainM3dRaster,
  renovationActionsEnabled,
  renovationFeedbackEnabled,
  renovationRevisionEnabled,
  renovationFollowupEnabled,
} from './renovation-policy.js';
import feedbackV4 from './renovation-feedback.generated.json';
import { createRuntimeArtGallery } from './runtime-art-gallery.js';

declare const __VOLAM_RASTER_ALIASES__: Readonly<Record<string, string>>;

type Mode = 'current' | 'candidate';
type ReviewAsset = {
  id: string;
  url: string;
  candidateUrl: string;
  density: number;
  renovated?: boolean;
  atlasCandidateUrl?: string;
};
interface Binding {
  key: string;
  candidateKey: string;
  entry: ReviewAsset;
  original?: HTMLImageElement | HTMLCanvasElement;
  originalSource?: Phaser.Textures.TextureSource;
  candidateSource?: Phaser.Textures.TextureSource;
}
const bindings = new WeakMap<Phaser.Scene, Binding[]>();
const production = new WeakMap<Phaser.Scene, Map<string, ReviewAsset>>();
const resampled = new WeakSet<Phaser.Textures.Texture>();
const frozen = new WeakSet<Phaser.Scene>();
export const runtimeArtReviewPaused = (scene: Phaser.Scene): boolean =>
  frozen.has(scene);
const enabled = () => {
  const q = new URLSearchParams(location.search);
  return q.has('debug') && q.get('runtimeArtReview') === '1';
};
const byUrl = new Map(manifest.assets.map((a) => [a.url, a]));
const renovatedByUrl = new Map(renovatedSkills.assets.map((a) => [a.url, a]));
const allByUrl = new Map(
  (allSkills as ReviewAsset[])
    .filter((a) => !retainM3dRaster(a.id))
    .map((a) => [a.url, a]),
);
const feedbackByUrl = new Map(
  (feedbackV4.assets as ReviewAsset[])
    .filter((a) => !retainM3dRaster(a.id))
    .map((a) => [a.url, a]),
);
const retainedNeedle = (allSkills as ReviewAsset[]).find(
  (a) => a.id === 'co_mo_fx',
)!;
const retainedNeedleV6 = (allSkills as ReviewAsset[]).find(
  (a) => a.id === 'tay_fx1',
)!;
const retainedPhatV6 = (allSkills as ReviewAsset[]).find(
  (a) => a.id === 'nd_rework',
)!;

function resampleFrame(frame: Phaser.Textures.Frame, density: number) {
  frame.cutX *= density;
  frame.cutY *= density;
  frame.cutWidth *= density;
  frame.cutHeight *= density;
  const canvas = frame.canvasData as {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  canvas.x *= density;
  canvas.y *= density;
  canvas.width *= density;
  canvas.height *= density;
}

export function productionArtBindings(scene: Phaser.Scene) {
  return [...(production.get(scene) ?? [])].map(([key, entry]) => ({
    key,
    id: entry.id,
    density: scene.textures.get(key).source[0]?.resolution,
  }));
}

/** The normal client requests only the selected PNG for each replaced sheet.
 * The comparison loads both sources while sharing the same atlas metadata. */
export function preloadRuntimeArtReview(scene: Phaser.Scene): void {
  const review = enabled();
  const complete = renovationActionsEnabled();
  const renovate =
    !review &&
    new URLSearchParams(location.search).get('renovationSkills') !== 'old';
  const items: Binding[] = [];
  const selected = production.get(scene) ?? new Map<string, ReviewAsset>();
  const sourceUrls =
    (scene.registry.get('runtime-art-urls') as
      Map<string, string> | undefined) ?? new Map<string, string>();
  scene.registry.set('runtime-art-urls', sourceUrls);
  bindings.set(scene, items);
  production.set(scene, selected);
  const select = (
    key: string,
    type: string,
    _loader: unknown,
    file: Phaser.Loader.File,
  ) => {
    if (renovate && type === 'json') {
      const path =
        typeof file.url === 'string'
          ? new URL(file.url, location.href).pathname
          : '';
      const retain =
        retainM3dRaster(key) ||
        retainM3dRaster(
          path
            .split('/')
            .at(-1)
            ?.replace(/\.json$/, '') ?? '',
        );
      const next =
        key === 'v6_nd_phat' && renovationFollowupEnabled()
          ? retainedPhatV6.atlasCandidateUrl
          : key === 'v6_tay_needle' && renovationFollowupEnabled()
            ? retainedNeedleV6.atlasCandidateUrl
            : key === 'co_mo_needle_v3' && renovationRevisionEnabled()
              ? retainedNeedle.atlasCandidateUrl
              : !retain
                ? ((renovationFeedbackEnabled()
                    ? ((feedbackV4.inlineAtlases as Record<string, string>)[
                        key
                      ] ?? (feedbackV4.atlases as Record<string, string>)[path])
                    : undefined) ??
                  (complete
                    ? ((actionInlineAtlases as Record<string, string>)[key] ??
                      selected.get(key)?.atlasCandidateUrl ??
                      (actionAtlases as Record<string, string>)[path])
                    : undefined) ??
                  (renovatedSkills.atlases as Record<string, string>)[path])
                : undefined;
      if (next) {
        file.url = next;
        if (file.state === Phaser.Loader.FILE_POPULATED) {
          file.data = undefined;
          file.state = Phaser.Loader.FILE_PENDING;
        }
      }
    }
    if (
      type !== 'image' ||
      key.startsWith('review-candidate:') ||
      (key.startsWith('co_mo_original_fx') && !complete)
    )
      return;
    if (typeof file.url !== 'string') return;
    const path = new URL(file.url, location.href).pathname;
    sourceUrls.set(key, path);
    const entry =
      key === 'v6_nd_phat' && renovationFollowupEnabled()
        ? retainedPhatV6
        : key === 'v6_tay_needle' && renovationFollowupEnabled()
          ? retainedNeedleV6
          : key === 'co_mo_needle_v3' && renovationRevisionEnabled()
            ? retainedNeedle
            : retainM3dRaster(key)
              ? byUrl.get(path)
              : ((renovationFeedbackEnabled()
                  ? feedbackByUrl.get(path)
                  : undefined) ??
                (complete ? allByUrl.get(path) : undefined) ??
                (renovate ? renovatedByUrl.get(path) : undefined) ??
                byUrl.get(path));
    if (!entry) return;
    if (!review) {
      file.url = entry.candidateUrl;
      sourceUrls.set(key, entry.candidateUrl);
      selected.set(key, entry);
      return;
    }
    const candidateKey = 'review-candidate:' + key;
    items.push({ key, candidateKey, entry });
    scene.load.image(candidateKey, entry.candidateUrl);
  };
  scene.load.on(Phaser.Loader.Events.ADD, select);
  const canonicalize = (
    _key: string,
    type: string,
    _loader: unknown,
    file: Phaser.Loader.File,
  ) => {
    if (type !== 'image' || typeof file.url !== 'string') return;
    const canonical = __VOLAM_RASTER_ALIASES__[file.url];
    if (canonical) file.url = canonical;
  };
  scene.load.on(Phaser.Loader.Events.ADD, canonicalize);
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    scene.load.off(Phaser.Loader.Events.ADD, select);
    scene.load.off(Phaser.Loader.Events.ADD, canonicalize);
  });
}

export function createRuntimeArtReview(scene: Phaser.Scene): void {
  if (!enabled()) {
    scene.registry.set(
      'renovated-skill-sources',
      new Map(
        [...(production.get(scene) ?? [])]
          .filter(([, entry]) => entry.renovated)
          .map(([key, entry]) => [key, entry.candidateUrl]),
      ),
    );
    for (const [key, { density }] of production.get(scene) ?? []) {
      if (density === 1 || !scene.textures.exists(key)) continue;
      const texture = scene.textures.get(key);
      if (resampled.has(texture)) continue;
      if (production.get(scene)?.get(key)?.renovated)
        setArtFilter(texture, Phaser.Textures.FilterMode.LINEAR);
      texture.source[0]!.resolution *= density;
      for (const frame of Object.values(texture.frames)) {
        if (frame.name === '__BASE') continue;
        resampleFrame(frame, density);
        frame.updateUVs();
      }
      resampled.add(texture);
    }
    return;
  }
  const items = bindings.get(scene) ?? [];
  for (const b of items) {
    const texture = scene.textures.get(b.key);
    const old = texture.getSourceImage() as HTMLImageElement;
    const next = scene.textures
      .get(b.candidateKey)
      .getSourceImage() as HTMLImageElement;
    const density = b.entry.density ?? 1;
    if (
      old.width * density !== next.width ||
      old.height * density !== next.height
    )
      throw Error('Review raster changes native sheet size: ' + b.key);
    b.original = old;
    b.originalSource = texture.source[0]!;
    b.candidateSource = scene.textures.get(b.candidateKey).source[0]!;
    b.candidateSource.resolution = b.originalSource.resolution * density;
    scene.textures
      .get(b.candidateKey)
      .setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  let mode: Mode = 'current';
  let lastSwitchMs = 0;
  let paused = false;
  const host = document.createElement('div');
  host.id = 'runtime-art-review';
  Object.assign(host.style, {
    position: 'absolute',
    bottom: '110px',
    left: '12px',
    zIndex: '60',
    background: '#18272bee',
    color: '#f5e9ca',
    padding: '8px',
    border: '1px solid #ad904e',
    font: '13px system-ui',
    maxWidth: '540px',
  });
  const label = document.createElement('span');
  const setMode = (value: Mode) => {
    const started = performance.now();
    if (value !== 'current' && value !== 'candidate')
      throw Error('Invalid art mode');
    for (const b of mode === value ? [] : items) {
      const source =
        value === 'current' ? b.originalSource! : b.candidateSource!;
      // Both sources are already loaded on GPU. Phaser 4.2.1 Frame.glTexture
      // reads Frame.source.glTexture; Canvas also samples Frame.source.image.
      // Keep UVs, trim, size and Frame identity. Each source retains its own
      // owning Texture, so shutdown never destroys a shared GPU handle twice.
      const texture = scene.textures.get(b.key);
      const density = b.entry.density ?? 1;
      const sample = (n: number) =>
        value === 'current' ? n / density : n * density;
      for (const frame of Object.values(texture.frames)) {
        frame.source = source;
        if (density === 1) continue;
        // Phaser's texturer divides the sampled rectangle by source.resolution.
        // Keep the logical frame/trim and normalized UVs at the original size.
        frame.cutX = sample(frame.cutX);
        frame.cutY = sample(frame.cutY);
        frame.cutWidth = sample(frame.cutWidth);
        frame.cutHeight = sample(frame.cutHeight);
        const canvas = frame.canvasData as {
          x: number;
          y: number;
          width: number;
          height: number;
        };
        canvas.x = sample(canvas.x);
        canvas.y = sample(canvas.y);
        canvas.width = sample(canvas.width);
        canvas.height = sample(canvas.height);
      }
    }
    mode = value;
    lastSwitchMs = performance.now() - started;
    label.textContent =
      value === 'current'
        ? 'Hiện hành · renderer production'
        : 'Artwork đã duyệt · M3D';
  };
  const setPaused = (value: boolean) => {
    paused = value;
    if (value) frozen.add(scene);
    else frozen.delete(scene);
    if (value) scene.scene.pause();
    else scene.scene.resume();
  };
  const button = (text: string, action: () => void) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.style.margin = '0 6px 5px 0';
    b.onclick = action;
    host.append(b);
  };
  button('Hiện hành', () => setMode('current'));
  button('Artwork mới', () => setMode('candidate'));
  button('Dừng / chạy hình', () => setPaused(!paused));
  host.append(document.createElement('br'), label);
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'Chọn đánh thường / skill / boss để kiểm tra';
  details.append(summary);
  const select = document.createElement('select');
  select.id = 'runtime-review-case';
  select.style.maxWidth = '360px';
  const note = document.createElement('div');
  note.style.maxWidth = '480px';
  const operation = async (op: string) => {
    setPaused(false);
    const s = (
      window as unknown as {
        __VOLAM__: { snapshot: () => { roomId: string; sessionId: string } };
      }
    ).__VOLAM__.snapshot();
    const r = await fetch(
      '/__visual_review?' +
        new URLSearchParams({
          op,
          room: s.roomId,
          player: s.sessionId,
          case: select.value,
        }),
      { method: 'POST' },
    );
    if (!r.ok) throw Error(await r.text());
    const data = await r.json();
    note.textContent =
      data.case.name +
      ' · ' +
      data.case.description +
      (data.case.kind === 'hero'
        ? ' Nhấn ' + (data.case.skill ? 'Q' : 'A') + ' để dùng.'
        : ' Dùng nút “Boss thi triển”.');
  };
  const prepare = document.createElement('button');
  prepare.textContent = 'Chuẩn bị';
  prepare.id = 'runtime-review-prepare';
  prepare.onclick = () => {
    void operation('prepare').catch((e) => {
      note.textContent = String(e);
    });
  };
  const cast = document.createElement('button');
  cast.textContent = 'Boss thi triển';
  cast.id = 'runtime-review-cast';
  cast.onclick = () => {
    void operation('cast').catch((e) => {
      note.textContent = String(e);
    });
  };
  details.append(select, prepare, cast, note);
  host.append(details);
  void fetch('/__visual_review')
    .then(async (r) => {
      if (!r.ok) {
        details.remove();
        return;
      }
      const cases = (await r.json()) as Array<{
        id: string;
        name: string;
        group: string;
      }>;
      const groups = new Map<string, HTMLOptGroupElement>();
      for (const c of cases) {
        let group = groups.get(c.group);
        if (!group) {
          group = document.createElement('optgroup');
          group.label = c.group;
          groups.set(c.group, group);
          select.append(group);
        }
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.name;
        group.append(option);
      }
    })
    .catch(() => details.remove());
  document.getElementById('viewport')!.append(host);
  const gallery =
    new URLSearchParams(location.search).get('artGallery') === '1'
      ? createRuntimeArtGallery(scene, setMode)
      : undefined;
  if (gallery) {
    // The standalone page owns all controls. Keep the game canvas full-size
    // inside its review surface, with no match HUD or lobby obscuring the art.
    const style = document.createElement('style');
    style.textContent =
      '#viewport > :not(#game){display:none!important} #game{inset:0!important;width:100%!important;height:100%!important}';
    document.head.append(style);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => style.remove());
  }
  const geometry = () =>
    scene.children.list
      .filter((o) => 'texture' in o)
      .map((o) => {
        const s = o as Phaser.GameObjects.Sprite;
        return {
          name: s.name,
          texture: s.texture.key,
          frame: s.frame.name,
          x: s.x,
          y: s.y,
          sx: s.scaleX,
          sy: s.scaleY,
          ox: s.originX,
          oy: s.originY,
          rotation: s.rotation,
          alpha: s.alpha,
          depth: s.depth,
          visible: s.visible,
        };
      });
  const api = {
    setMode,
    setPaused,
    gallery,
    inspect: () => ({
      mode,
      lastSwitchMs,
      fps: scene.game.loop.actualFps,
      paused,
      sourceCommit: manifest.sourceCommit,
      vfxRevision: manifest.revision,
      assets: items.map((b) => ({ key: b.key, ...b.entry })),
      rasterBindings: items.map((b) => ({
        key: b.key,
        candidate: Object.values(scene.textures.get(b.key).frames).every(
          (f) => f.source === b.candidateSource,
        ),
      })),
      camera: {
        zoom: scene.cameras.main.zoom,
        x: scene.cameras.main.scrollX,
        y: scene.cameras.main.scrollY,
      },
      geometry: geometry(),
    }),
  };
  (
    window as unknown as { __RUNTIME_ART_REVIEW__: typeof api }
  ).__RUNTIME_ART_REVIEW__ = api;
  setMode('current');
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => host.remove());
}
