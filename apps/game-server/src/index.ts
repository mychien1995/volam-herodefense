import { z } from 'zod';
import { createGameServer } from './app.config.js';

const port = z.coerce
  .number()
  .int()
  .min(1)
  .max(65535)
  .parse(process.env['PORT'] ?? 2567);
const server = createGameServer();
await server.listen(port);
console.info(`M0 server ready: http://localhost:${port}/health`);
