// Explicit map authoring recipe. Runtime preparation copies the retained Tiled source.
import { writeIfChanged } from './asset-files.mjs';
const root = new URL('../', import.meta.url);
const save = (path, value) =>
  writeIfChanged(new URL(path, root), JSON.stringify(value, null, 2) + '\n');
const tileLayer = (name, id, data) => ({
  id,
  name,
  type: 'tilelayer',
  width: 40,
  height: 30,
  opacity: 1,
  visible: true,
  x: 0,
  y: 0,
  data,
});
const ground = [],
  details = [];
for (let y = 0; y < 30; y++)
  for (let x = 0; x < 40; x++) {
    ground.push(
      1 +
        (x >= 3 && x < 37 && y >= 4 && y < 29
          ? (x * 13 + y * 7 + Math.floor(y / 3)) % 4
          : 4 + ((x + y) % 4)),
    );
    details.push(
      (x === 4 || x === 35 || y === 26) && (x + y) % 3 === 0 ? 10 : 0,
    );
  }
let oid = 1;
const point = (name, x, y, type = 'marker') => ({
  id: oid++,
  name,
  type,
  x,
  y,
  width: 0,
  height: 0,
  rotation: 0,
  visible: true,
  point: true,
});
const rect = (name, x, y, width, height) => ({
  id: oid++,
  name,
  type: 'collision',
  x,
  y,
  width,
  height,
  rotation: 0,
  visible: true,
});
const markers = [
  point('hero_spawn', 640, 736),
  point('exit_portal', 640, 872),
  point('boss_spawn', 640, 448),
];
for (const [i, p] of [
  [512, 384],
  [768, 384],
  [512, 576],
  [768, 576],
].entries())
  markers.push(point('summon_spawn_' + i, ...p));
for (let i = 0; i < 3; i++)
  for (const [side, x, y, fx, fy] of [
    ['west', 128, 320 + i * 128, 1, 0],
    ['east', 1152, 320 + i * 128, -1, 0],
    ['north', 384 + i * 256, 384, 0, 1],
    ['south', 384 + i * 256, 864, 0, -1],
  ])
    markers.push({
      ...point(`emitter_${side}_${i}`, x, y),
      properties: [
        { name: 'fx', type: 'float', value: fx },
        { name: 'fy', type: 'float', value: fy },
      ],
    });
const placements = [
  ['male_founder_statue', 448, 352],
  ['female_founder_statue', 832, 352],
  ['altar', 640, 320],
  ['lotus_pillar', 144, 192],
  ['lotus_pillar', 1136, 192],
  ['faded_banner', 480, 240],
  ['faded_banner', 800, 240],
  ['jade_lantern', 352, 512],
  ['jade_lantern', 928, 512],
  ['jade_lantern', 112, 704],
  ['jade_lantern', 1168, 704],
  ['plum_vase', 352, 352],
  ['plum_vase', 928, 352],
  ['sword_rack', 112, 832],
  ['stone_bench', 1168, 832],
  ['cave_corner', 48, 160],
  ['cave_corner', 1232, 160],
  ['stalagmites', 48, 544],
  ['stalagmites', 1232, 544],
  ['funerary_urn', 208, 864],
  ['funerary_urn', 1072, 864],
  ['tomb_school_arch', 640, 928],
];
const collisions = [
  rect('north_wall', 0, 0, 1280, 128),
  rect('west_wall', 0, 128, 96, 832),
  rect('east_wall', 1184, 128, 96, 832),
  rect('south_wall', 96, 928, 1088, 32),
];
for (const [name, x, y] of placements.filter(([name]) =>
  ['male_founder_statue', 'female_founder_statue', 'altar'].includes(name),
))
  collisions.push(rect(name, x - 28, y - 16, 56, 24));
collisions.push(
  rect('gate_left', 592, 892, 16, 36),
  rect('gate_right', 672, 892, 16, 36),
);
const map = {
  type: 'map',
  version: '1.10',
  tiledversion: '1.11.2',
  orientation: 'orthogonal',
  renderorder: 'right-down',
  width: 40,
  height: 30,
  tilewidth: 32,
  tileheight: 32,
  infinite: false,
  nextlayerid: 6,
  nextobjectid: oid + placements.length,
  layers: [
    tileLayer('ground', 1, ground),
    tileLayer('details', 2, details),
    {
      id: 3,
      name: 'scenery',
      type: 'objectgroup',
      opacity: 1,
      visible: true,
      x: 0,
      y: 0,
      objects: placements.map(([name, x, y]) => point(name, x, y, 'scenery')),
    },
    {
      id: 4,
      name: 'collision',
      type: 'objectgroup',
      opacity: 1,
      visible: true,
      x: 0,
      y: 0,
      objects: collisions,
    },
    {
      id: 5,
      name: 'markers',
      type: 'objectgroup',
      opacity: 1,
      visible: true,
      x: 0,
      y: 0,
      objects: markers,
    },
  ],
  tilesets: [
    {
      firstgid: 1,
      name: 'co_mo_terrain',
      tilewidth: 32,
      tileheight: 32,
      tilecount: 16,
      columns: 4,
      image: '../assets/sprites/environment/co-mo-phai/terrain.png',
      imagewidth: 128,
      imageheight: 128,
      margin: 0,
      spacing: 0,
    },
  ],
};
save('maps/boss_co_mo.tmj', map);
