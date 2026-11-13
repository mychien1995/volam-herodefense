import type Phaser from 'phaser';

// Versioned candidates preserve the locked originals and stable runtime keys.
export const revisedBasics: Record<string, string> = {
  thien_son_phien: 'hero_thien_son',
  thien_son_dao: 'hero_thien_son_dao',
  vo_dang_quyen: 'hero_vo_dang',
  vo_dang_kiem: 'hero_vo_dang_kiem',
  thieu_lam_quyen: 'hero_thieu_lam',
  thieu_lam_dao: 'hero_thieu_lam_dao',
};
export function isRevisedHero(id: string): boolean {
  return Object.values(revisedBasics).includes(id);
}
export function characterFolder(id: string): string {
  return isRevisedHero(id) ? 'characters/visual_improvement_v02' : 'characters';
}
export function heroIdleUrl(id: string): string {
  if (id.startsWith('hero_con_luan_'))
    return `/assets/characters/con_luan_skill_preview/icons/${id}.png`;
  return `/assets/${characterFolder(id)}/${id}_idle.png`;
}
interface Body {
  texture: string;
  animation: string;
  origin: [number, number];
  firstFrame: string;
  scale: number;
  token: string;
  durationMs: number;
  timeScale: number;
  startFrame: number;
  abilityId?: string;
  phase?: string;
  progress?: number;
}

// Reuse the accepted event/phase clock. No combat, VFX or cast-body routing changes.
export function revisedBasicBody<T extends Body>(
  scene: Pick<Phaser.Scene, 'anims'>,
  body: T | undefined,
): T | undefined {
  const texture = body?.abilityId && revisedBasics[body.abilityId];
  if (!body || !texture || body.texture === 'shaolin_quyen_body') return body;
  const direction = body.firstFrame.match(
    /_(down|left|right|up)_\d+(?:\.png)?$/,
  )?.[1];
  if (!direction) return body;
  const progress = Math.max(0, Math.min(1, body.progress ?? 0));
  let index = Math.min(3, Math.floor(progress * 4));
  const unarmed =
    body.abilityId === 'vo_dang_quyen' || body.abilityId === 'thieu_lam_quyen';
  if (unarmed) {
    const phase = body.phase ?? '';
    index = phase.startsWith('roundhouse_kick')
      ? 3
      : phase.startsWith('front_kick')
        ? 2
        : phase.startsWith('right_fist') || phase.startsWith('right_palm')
          ? 1
          : 0;
  }
  const frame =
    unarmed && (progress < 0.18 || progress > 0.86)
      ? `idle_${direction}_0`
      : `basic_attack_${direction}_${index}`;
  // A bounded cache per authored cel, never per attack/event token.
  const animation = `visual_v02_body:${texture}:${frame}`;
  if (!scene.anims.exists(animation))
    scene.anims.create({
      key: animation,
      frames: [{ key: texture, frame }],
      frameRate: 1,
      repeat: 0,
    });
  return {
    ...body,
    texture,
    animation,
    firstFrame: frame,
    origin: [0.5, 0.8],
    scale: 1,
    timeScale: 1,
    startFrame: 0,
    token: `feedback:visual-v02:${body.token}:${frame}`,
  };
}
