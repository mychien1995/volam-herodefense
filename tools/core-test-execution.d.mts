export function coreTestExecution(env?: NodeJS.ProcessEnv): {
  pool: 'forks';
  isolate: true;
  fileParallelism: boolean;
  maxWorkers: number;
};
