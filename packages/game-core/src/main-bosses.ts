import { BacCaiEncounter } from './bac-cai.js';
import type { BacCaiDefinition } from './bac-cai-types.js';
import type { InvasionDirector } from './invasions.js';
import type { SimulationConfig, World } from './types.js';
import { VuongEncounter, type VuongDefinition } from './vuong-trung-duong.js';
export const mainBossOrder = [
  'dong_ta',
  'tay_doc',
  'nam_de',
  'bac_cai',
  'vuong_trung_duong',
] as const;
/** Minimal progression hook. Earlier encounter adapters must report their actual defeat in order. */
export class MainBossDirector {
  private completed: string[] = [];
  private eligibleAt: number | undefined;
  private finalAt: number | undefined;
  encounter: BacCaiEncounter | undefined;
  constructor(readonly definition: BacCaiDefinition, readonly final?: VuongDefinition) {}
  recordDefeat(id: (typeof mainBossOrder)[number]): boolean {
    if (mainBossOrder[this.completed.length] !== id) return false;
    this.completed.push(id);
    return true;
  }
  get defeatedBosses(): readonly string[] {
    return [...this.completed];
  }
  step(w: World, c: SimulationConfig, invasion: InvasionDirector | undefined) {
    if (this.encounter?.phase === 'defeated') this.recordDefeat('bac_cai');
    if (!invasion || invasion.defeated) return;
    if (this.final && this.completed.length === 4) {
      if (w.vuong) {
        if (w.vuong.defeat(w, c)) this.recordDefeat('vuong_trung_duong');
        return;
      }
      this.finalAt ??= w.tick + Math.max(1, Math.round(this.final.restMs * c.tickRate / 1000));
      if (w.tick >= this.finalAt) {
        w.creeps.delete('bac_cai');
        new VuongEncounter(this.final).initialize(w, c);
      }
      return;
    }
    if (
      this.encounter ||
      invasion.wave < 20 ||
      this.completed.length !== 3
    )
      return;
    if (
      [...w.creeps.values()].some(
        (e) => e.invasion && e.invasion.wave <= 20 && e.hp > 0,
      )
    )
      return;
    this.eligibleAt ??=
      w.tick + Math.round((this.definition.restMs * c.tickRate) / 1000);
    if (w.tick < this.eligibleAt) return;
    this.encounter = new BacCaiEncounter(this.definition);
    this.encounter.initialize(w, c);
  }
}
