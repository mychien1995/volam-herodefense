import { describe, it, expect } from 'vitest';
import { m1Config } from '@volam/game-data';
import { readFileSync } from 'node:fs';
import { renovationActionCel } from '../apps/game-client/src/renovation-action-model.js';
import { renovatedSevenStarCues } from '../apps/game-client/src/renovation-sword-layout.js';
import raw from '../apps/game-client/src/renovation-actions.generated.json' with { type: 'json' };
const actors: Record<string, string> = {
  cai_bang_bong: 'hero_cai_bang',
  cai_bang_chuong: 'hero_cai_bang_chuong',
  thien_son_phien: 'hero_thien_son',
  thien_son_dao: 'hero_thien_son_dao',
  vo_dang_quyen: 'hero_vo_dang',
  vo_dang_kiem: 'hero_vo_dang_kiem',
  thieu_lam_quyen: 'hero_thieu_lam',
  thieu_lam_dao: 'hero_thieu_lam_dao',
};
describe('renovated actions retain semantic phases and registrations', () => {
  it('keeps each caster identity through all 43 mixed-school skills and recovery', () => {
    const ids = new Set(raw.bodies.map((b) => b.id));
    expect(Object.keys(m1Config.skillCatalogue!)).toHaveLength(43);
    for (const actor of Object.values(actors))
      for (const skill of Object.keys(m1Config.skillCatalogue!))
        for (const p of [0, 0.3, 0.6, 0.99]) {
          const cel = renovationActionCel(actor, skill, 'cast_right', p);
          expect(ids.has(cel.sheet), actor + ':' + skill).toBe(true);
          expect(cel.index).toBeGreaterThanOrEqual(0);
          expect(cel.index).toBeLessThan(4);
          expect(raw.bodies.find((b) => b.id === cel.sheet)?.actor).toBe(actor);
        }
  });
  it('never falls back to old Wudang during the sustained sword channel', () => {
    for (const p of [0, 0.2, 0.9, 1])
      expect(
        renovationActionCel(
          'hero_vo_dang_kiem',
          'van_kiem_quy_tong',
          'cast_right',
          p,
        ),
      ).toEqual({ sheet: 'v2:vo_dang_cast', index: 2, phase: 'channel' });
    expect(
      renovationActionCel(
        'hero_vo_dang_kiem',
        'nhan_kiem_hop_nhat',
        'cast_down',
        0.5,
      ).phase,
    ).toBe('empty-hand');
    expect(
      renovationActionCel('hero_thieu_lam', 'hoanh_tao_cuoc', 'cast_up', 0.5)
        .phase,
    ).toBe('stationary-stomp');
    expect(
      renovationActionCel('hero_thieu_lam', 'nhu_lai_niet_ban', 'cast_up', 0.5)
        .index,
    ).toBe(2);
    expect(
      Number.isFinite(
        renovationActionCel('hero_cai_bang', 'thien_ha_vo_cau', 'whirl', NaN)
          .index,
      ),
    ).toBe(true);
  });
  it('registers seven real Seven Star impacts to existing hand sockets without the distant decorative orbit', () => {
    const e = m1Config.skillCatalogue!.that_tinh_kiem!.effect;
    if (e.mode !== 'multi_hit') throw Error('multi_hit required');
    const clips = renovatedSevenStarCues(
        e.hits,
        e.spacingTicks,
        m1Config.tickRate,
      ),
      fx = clips.filter((c) => !c.body);
    expect(fx).toHaveLength(7);
    expect(fx.map((c) => c.at)).toEqual(
      [0, 1, 2, 3, 4, 5, 6].map(
        (i) => (i * e.spacingTicks * 1000) / m1Config.tickRate,
      ),
    );
    for (const cue of fx) {
      expect(cue.from).toEqual([0, 0]);
      expect(cue.to).toEqual([0, 0]);
      expect(cue.tag).toMatch(/^slash_[ab]$/);
    }
  });
  it('maps Vương elemental source rows to the actual Kim/Mộc/Thủy/Hỏa/Thổ runtime order', () => {
    const plan = JSON.parse(
      readFileSync('assets/source/renovation-v3/fx-plan.json', 'utf8'),
    ) as Array<{
      id: string;
      frames: Array<{
        name: string;
        job?: string;
        source?: [string, number[]];
      }>;
    }>;
    const atlas = plan.find((a) => a.id === 'vtd_effects')!;
    for (const [element, row] of [3, 0, 4, 1, 2].entries()) {
      const f =
        atlas.frames.find((f) => f.name === 'element' + element + '_0') ??
        atlas.frames.find((f) => f.name.startsWith('element' + element));
      expect(f?.job).toBe('vuong_elements');
      // The source has five exact rows; avoid silently swapping Metal with Wood.
      const height = readFileSync(
        'assets/source/renovation-v3/raw/vuong_elements.png',
      ).readUInt32BE(20);
      expect(f?.source?.[1][1]).toBe(Math.round((height * row) / 5));
    }
  });
});
