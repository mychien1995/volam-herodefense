import { createServer } from 'node:http';
import { requireQaPorts, verifyQaIdentity } from './qa-session.mjs';

/** Native loopback fixture, closed by its handle even if bind/identity fails. */
export async function startQaHttpFixture(
  owned,
  { port, ...identity },
  handler,
) {
  await requireQaPorts([port]);
  const expected = { service: 'volam-qa-fixture', ...identity };
  const server = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/__volam_qa_identity') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(expected));
    } else handler(req, res);
  });
  owned.add(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) =>
          error && error.code !== 'ERR_SERVER_NOT_RUNNING'
            ? reject(error)
            : resolve(),
        );
        server.closeAllConnections();
      }),
  );
  await new Promise((resolve, reject) =>
    server.once('error', reject).listen(port, '127.0.0.1', resolve),
  );
  await verifyQaIdentity(
    `http://127.0.0.1:${port}/__volam_qa_identity`,
    expected,
  );
  return server;
}
