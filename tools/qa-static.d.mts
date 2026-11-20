export function startQaStatic(options: {
  script: string;
  port: number;
  environment?: Record<string, string>;
  directory?: string;
  timeout?: number;
}): Promise<() => Promise<void>>;
