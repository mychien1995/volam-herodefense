import ndt from '../../../assets/exports/ngu-doc-ta-hiep-unified-v1/manifest.json';
import ndc from '../../../assets/exports/ngu-doc-co-su-unified-v1/manifest.json';
import dmc from '../../../assets/exports/duong-mon-co-quan-unified-v1/manifest.json';
import dma from '../../../assets/exports/duong-mon-am-khi-unified-v1/manifest.json';
import clm from '../../../assets/exports/con-luan-thien-su-unified-v1/manifest.json';
import cls from '../../../assets/exports/con-luan-kiem-ton-unified-v1/manifest.json';
import slq from '../../../assets/exports/thieu-lam-quyen-unified-v1/manifest.json';
import sld from '../../../assets/exports/thieu-lam-dao-unified-v1/manifest.json';
import phien from '../../../assets/exports/thien-son-phien-unified-v1/manifest.json';
import dao from '../../../assets/exports/thien-son-dao-unified-v1/manifest.json';
import Phaser from 'phaser';
import quyen from '../../../assets/exports/vo-dang-quyen-unified-v1/manifest.json';
import kiem from '../../../assets/exports/vo-dang-kiem-unified-v1/manifest.json';
import bong from '../../../assets/exports/cai-bang-bong-unified-v1/manifest.json';
import { setArtFilter } from './art-filter.js';
import {
  unifiedBodySample,
  type UnifiedHeroClock,
} from './unified-hero-policy.js';
const actorIds: Record<string, string> = {
  cai_bang_bong: 'hero_cai_bang',
  vo_dang_quyen: 'hero_vo_dang',
  vo_dang_kiem: 'hero_vo_dang_kiem',
  thien_son_phien: 'hero_thien_son',
  thien_son_dao: 'hero_thien_son_dao',
  thieu_lam_quyen: 'hero_thieu_lam',
  thieu_lam_dao: 'hero_thieu_lam_dao',
  con_luan_thien_su: 'hero_con_luan_thien_su',
  con_luan_kiem_ton: 'hero_con_luan_kiem_ton',
  duong_mon_co_quan: 'duong-mon-tuan-sa-walk',
  duong_mon_am_khi: 'duong-mon-da-hanh-walk',
  ngu_doc_ta_hiep: 'ngu-doc-bich-co',
  ngu_doc_co_su: 'ngu-doc-am-linh',
};
const profiles = new Map(
  [bong, quyen, kiem, phien, dao, slq, sld, clm, cls, dmc, dma, ndt, ndc].map(
    (p) => [p.basic, p],
  ),
);
export const unifiedHeroBasics: ReadonlySet<string> = new Set(
  [...profiles.values()]
    .filter((p) => p.directions.length === 8)
    .map((p) => p.basic),
);
const ring = [
  'right',
  'down_right',
  'down',
  'down_left',
  'left',
  'up_left',
  'up',
  'up_right',
];
export function preloadUnifiedHeroes(scene: Phaser.Scene): void {
  for (const p of profiles.values())
    scene.load.atlas(
      p.texture,
      '/assets/' + p.folder + '/body.png',
      '/assets/' + p.folder + '/body.json',
    );
}
export function presentUnifiedHero(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  basic: string | undefined,
  pose: string,
  direction: string,
  clock?: UnifiedHeroClock,
): boolean {
  const p = basic && profiles.get(basic);
  if (!p) return false;
  const previous = sprite.getData('unified-body-state') as
    { basic: string; pose: string; at: number } | undefined;
  const at =
    previous?.basic === basic && previous.pose === pose
      ? previous.at
      : scene.time.now;
  const nativeKey = sprite.texture.key;
  const nativeFrame = String(sprite.frame.name);
  const cue =
    basic === 'thien_son_dao' && nativeKey === 'tam-lien-poses'
      ? 'dao:' + nativeFrame
      : basic === 'vo_dang_quyen' &&
          ['vdq-punch', 'vdq-cast'].includes(nativeKey)
        ? nativeFrame
        : basic === 'vo_dang_kiem' && nativeKey === 'vdk-body'
          ? nativeFrame.replace(/^(down|up|left|right)_/, '')
          : undefined;
  const bodyClock = cue && clock ? { ...clock, nativeBodyCue: cue } : clock;
  const sample = unifiedBodySample(
    basic,
    pose,
    scene.time.now - at,
    scene.time.now,
    bodyClock,
  );
  if (!sample) return false;
  const base = sample.cardinal
    ? direction.includes('down')
      ? 'down'
      : direction.includes('up')
        ? 'up'
        : direction
    : direction;
  const facing = ring[(ring.indexOf(base) + sample.turns + 8) % 8]!;
  // Single-facing production gate may be built before the rest; final validator requires all8.
  if (!p.directions.includes(facing) || !scene.textures.exists(p.texture))
    return false;
  const poseName = sample.pose;
  const frame = poseName + '_' + facing,
    texture = scene.textures.get(p.texture);
  if (!texture.has(frame))
    throw new Error('Missing coherent hero cel ' + basic + ':' + frame);
  setArtFilter(texture, Phaser.Textures.FilterMode.LINEAR);
  sprite
    .stop()
    .setTexture(p.texture, frame)
    .setOrigin(p.pivot[0]!, p.pivot[1]!)
    .setScale(p.scale)
    .setFlip(false, false)
    .setRotation(0);
  sprite.setData('unified-body-state', { basic, pose, at });
  sprite.setData('unified-body-phase', clock?.phase ?? '');
  sprite
    .setData('hero-motion-active', true)
    .setData('hero-motion-direction', facing)
    .setData(
      'hero-motion-body-width',
      p.bodyWidth * (sample.bodyWidthScale ?? 1),
    );
  sprite.setData('renovation', {
    id: actorIds[basic!] ?? 'hero_cai_bang',
    pose,
    direction: facing,
    locomotion: pose === 'idle' || pose === 'walk',
    bodySet: p.texture,
    actionFamily: sample.pose,
  });
  return true;
}

/** Complete canonical body profile for independently positioned skill body doubles. */
export const unifiedHeroProfile = (basic: string) => {
  const p = profiles.get(basic);
  return p?.directions.length === 8 ? p : undefined;
};
