import { writeFileSync } from 'node:fs';

/** Timing only: no selection hook and no status override. Parent validates the receipt. */
export default class QaCostReporter {
  constructor() {
    this.loadedAt = Date.now();
    this.tests = [];
    this.steps = new Map();
  }
  onBegin() {
    this.beginAt = Date.now();
  }
  onTestBegin(test, result) {
    this.tests.push({
      title: test.title,
      startedAt: result.startTime.getTime(),
    });
  }
  onStepEnd(_test, _result, step) {
    const key = step.category + ':' + step.title;
    if (!this.steps.has(key))
      this.steps.set(key, {
        category: step.category,
        title: step.title,
        count: 0,
        milliseconds: 0,
      });
    const value = this.steps.get(key);
    value.count++;
    value.milliseconds += step.duration;
  }
  onTestEnd(_test, result) {
    Object.assign(this.tests.at(-1), {
      status: result.status,
      milliseconds: result.duration,
    });
  }
  onEnd(result) {
    writeFileSync(
      process.env.VOLAM_QA_BROWSER_COST_OUTPUT,
      JSON.stringify(
        {
          schemaVersion: 1,
          status: result.status,
          spawnedAt: Number(process.env.VOLAM_QA_BROWSER_SPAWNED_AT),
          loadedAt: this.loadedAt,
          beginAt: this.beginAt,
          endAt: Date.now(),
          tests: this.tests,
          steps: [...this.steps.values()]
            .sort((a, b) => b.milliseconds - a.milliseconds)
            .slice(0, 25),
          limits:
            'Reporter milestones use wall timestamps in one host. Fixture/API step durations can overlap; do not sum them as disjoint phases.',
        },
        null,
        2,
      ) + '\n',
    );
  }
}
