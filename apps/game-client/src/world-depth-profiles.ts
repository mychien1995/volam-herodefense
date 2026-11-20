export interface WorldDepthProfile {
  id: string;
  daylight: number;
  shade: number;
  sun: [number, number, number];
  ambient: [number, number, number];
  cast: number;
  direction: [number, number];
  groundDepth: number;
  theme: string;
}
const outdoor = {
  daylight: 0.12,
  shade: 0.15,
  sun: [255, 226, 167] as [number, number, number],
  ambient: [133, 137, 115] as [number, number, number],
  cast: 0.2,
  direction: [0.62, 0.3] as [number, number],
  groundDepth: -9980,
};
export const depthProfiles: Record<string, WorldDepthProfile> = {
  arena: { ...outdoor, id: 'arena', theme: 'warm dappled daylight' },
  forest: {
    ...outdoor,
    id: 'forest',
    daylight: 0.16,
    shade: 0.22,
    ambient: [100, 132, 94],
    theme: 'canopy sun windows',
  },
  desert: {
    ...outdoor,
    id: 'desert',
    daylight: 0.12,
    shade: 0.1,
    cast: 0.18,
    direction: [0.42, 0.24],
    theme: 'high dry sunlight',
  },
  sea: {
    ...outdoor,
    id: 'sea',
    daylight: 0.1,
    shade: 0.08,
    sun: [220, 239, 255],
    ambient: [135, 160, 174],
    theme: 'clear coastal light',
  },
  hell: {
    ...outdoor,
    id: 'hell',
    daylight: 0,
    shade: 0.1,
    sun: [255, 132, 49],
    ambient: [152, 105, 130],
    cast: 0.14,
    theme: 'lava glow; no sunlight',
  },
  co_mo: {
    ...outdoor,
    id: 'co_mo',
    daylight: 0,
    shade: 0.1,
    sun: [137, 228, 209],
    ambient: [117, 130, 150],
    cast: 0.15,
    theme: 'jade lantern illumination',
  },
  chu_ba_thong: {
    ...outdoor,
    id: 'chu_ba_thong',
    daylight: 0.14,
    shade: 0.16,
    ambient: [112, 143, 111],
    theme: 'garden daylight',
  },
  hong_liet: {
    ...outdoor,
    id: 'hong_liet',
    daylight: 0.1,
    shade: 0.12,
    theme: 'warm camp daylight',
  },
  kim_luan: {
    ...outdoor,
    id: 'kim_luan',
    daylight: 0.09,
    shade: 0.09,
    theme: 'bright courtyard',
  },
  loi_dai: {
    ...outdoor,
    id: 'loi_dai',
    daylight: 0.07,
    shade: 0.07,
    cast: 0.16,
    groundDepth: -78,
    theme: 'readable redwood arena',
  },
};
export function depthProfile(zone: string): WorldDepthProfile {
  if (zone === 'arena' || zone === 'loi_dai') return depthProfiles[zone]!;
  const id = Object.keys(depthProfiles).find(
    (id) => zone === id || zone.startsWith(id + '_'),
  );
  if (!id) throw Error('Missing visual profile for zone ' + zone);
  return depthProfiles[id]!;
}
