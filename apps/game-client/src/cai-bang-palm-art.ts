import type { SkillArtComponent } from '@volam/game-data';
import type { RasterAnimation } from './skill-art-registry.js';
import palmLayout from './cai-bang-palm-layout.json' with { type: 'json' };
import cuongLongLayout from './cai-bang-cuong-long-layout.json' with { type: 'json' };
import cuongLongV2Layout from './cai-bang-cuong-long-v2-layout.json' with { type: 'json' };
import cuongLongV3Layout from './cai-bang-cuong-long-v3-layout.json' with { type: 'json' };
import phiLongLayout from './cai-bang-phi-long-layout.json' with { type: 'json' };
import phiLongEndingLayout from './cai-bang-phi-long-ending-layout.json' with { type: 'json' };
import phiLongTrailLayout from './cai-bang-phi-long-trail-layout.json' with { type: 'json' };
import phiLongTrailV2Layout from './cai-bang-phi-long-trail-v2-layout.json' with { type: 'json' };
import hangLongLayout from './cai-bang-hang-long-layout.json' with { type: 'json' };
import hangLongV2Layout from './cai-bang-hang-long-v2-layout.json' with { type: 'json' };

export const caiBangPalmId = 'cai_bang_chuong';
export const cuongLongId = 'cuong_long_loan_vu';
export const phiLongId = 'phi_long_tai_thien';
export const hangLongId = 'hang_long_hoa_vu';
export const cuongLongBlastDiameter = 128;

type FireClip = {
  name: string;
  durations: number[];
  loop: boolean;
  stage: string;
  placement: string;
  offsetY: number;
};
type FireArt = SkillArtComponent & {
  animations: (SkillArtComponent['animations'][number] & RasterAnimation)[];
};

function fireArt(
  id: string,
  skillId: string,
  layout: { width: number; height: number; pivot: number[]; clips: FireClip[] },
): FireArt {
  const frameDimensions: [number, number] = [layout.width, layout.height];
  const origin: [number, number] = [
    layout.pivot[0]! / layout.width,
    layout.pivot[1]! / layout.height,
  ];
  const base = `assets/exports/effects/${id}`;
  return {
    id,
    skillId,
    kind: 'vfx',
    sheet: base + '.png',
    atlas: base + '.json',
    origin,
    frameDimensions,
    displayScale: 1,
    animations: layout.clips.map(
      ({ name, durations, loop, stage, placement, offsetY }) => ({
        name,
        frames: durations.map((_, index) => `${name}_${index}`),
        frameCount: durations.length,
        frameRate:
          (durations.length * 1000) / durations.reduce((a, b) => a + b),
        frameDurationsMs: durations,
        repeat: loop ? -1 : 0,
        direction: stage === 'travel' ? 'right' : 'none',
        origin,
        frameDimensions,
        stage,
        placement,
        effectPlacementOffset: [0, offsetY],
      }),
    ),
  };
}

export const caiBangPalmArt = fireArt('cai_bang_palm_v1', caiBangPalmId, {
  ...palmLayout,
  clips: palmLayout.clips.map((clip) => {
    const flight = clip.name.endsWith('_flight');
    return {
      ...clip,
      loop: flight,
      stage: flight ? 'travel' : 'impact',
      placement: flight ? 'projectile' : 'target',
      offsetY: -20,
    };
  }),
});
export const cuongLongArt = fireArt(
  'cai_bang_cuong_long_v1',
  cuongLongId,
  cuongLongLayout,
);
export const cuongLongV2Art = fireArt(
  'cai_bang_cuong_long_v2',
  cuongLongId,
  cuongLongV2Layout,
);
export const cuongLongV3Art = fireArt(
  'cai_bang_cuong_long_v3',
  cuongLongId,
  cuongLongV3Layout,
);
export const phiLongArt = fireArt(
  'cai_bang_phi_long_v1',
  phiLongId,
  phiLongLayout,
);
export const phiLongEndingArt = fireArt(
  'cai_bang_phi_long_ending_v1',
  phiLongId,
  phiLongEndingLayout,
);
const showHangLongV1 =
  typeof location !== 'undefined' &&
  new URLSearchParams(location.search).get('hangLongVfx') === 'v1';
export const hangLongArt = showHangLongV1
  ? fireArt('cai_bang_hang_long_v1', hangLongId, hangLongLayout)
  : fireArt('cai_bang_hang_long_v2', hangLongId, hangLongV2Layout);
export const showOriginalPhiLongTrail =
  typeof location !== 'undefined' &&
  new URLSearchParams(location.search).get('phiLongTrail') === 'v1';
export const phiLongTrailArt = showOriginalPhiLongTrail
  ? fireArt('cai_bang_phi_long_trail_v1', phiLongId, phiLongTrailLayout)
  : fireArt('cai_bang_phi_long_trail_v2', phiLongId, phiLongTrailV2Layout);

function fireArtEnabled(flag: string): boolean {
  const query = new URLSearchParams(
    typeof location === 'undefined' ? '' : location.search,
  );
  return (
    query.get(flag) !== 'old' &&
    !query.has('renovationSkills') &&
    query.get('runtimeArtReview') !== '1'
  );
}

export const caiBangPalmEnabled = () => fireArtEnabled('palmVfx');
export const cuongLongEnabled = () => fireArtEnabled('cuongLongVfx');
export const phiLongEnabled = () => fireArtEnabled('phiLongVfx');
export const phiLongEndingEnabled = () => fireArtEnabled('phiLongEnding');
export const hangLongEnabled = () => fireArtEnabled('hangLongVfx');
function cuongLongVersion(): string | null {
  const query = new URLSearchParams(
    typeof location === 'undefined' ? '' : location.search,
  );
  return query.get('cuongLongVfx');
}
export function cuongLongDetailArt(): FireArt {
  return cuongLongVersion() === 'v1' ? cuongLongArt : cuongLongV2Art;
}
export function cuongLongFlightArt(): FireArt {
  switch (cuongLongVersion()) {
    case 'v1':
      return cuongLongArt;
    case 'v2':
      return cuongLongV2Art;
    default:
      return cuongLongV3Art;
  }
}
