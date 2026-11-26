import type { Plugin } from 'vite';
export function runtimeDeliveryPlugin(options: {
  runtimePublicDir: string | undefined;
  aliases: Record<string, string>;
}): Plugin;
