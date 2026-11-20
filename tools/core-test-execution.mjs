/** Bounded file workers only. Never disable isolation or parallelize tests within a file. */
export function coreTestExecution(env = process.env) {
  const value = env.VOLAM_CORE_WORKERS ?? '2';
  if (!/^[1-4]$/.test(value))
    throw Error('VOLAM_CORE_WORKERS must be an integer from 1 to 4');
  const maxWorkers = Number(value);
  return {
    pool: 'forks',
    isolate: true,
    fileParallelism: maxWorkers > 1,
    maxWorkers,
  };
}
