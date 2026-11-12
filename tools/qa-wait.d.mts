export function waitForQa(
  predicate: () => unknown | Promise<unknown>,
  label: string,
  options?: {
    timeout?: number;
    interval?: number;
    diagnostics?: () => unknown | Promise<unknown>;
  },
): Promise<void>;
