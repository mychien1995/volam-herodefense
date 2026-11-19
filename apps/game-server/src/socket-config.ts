/** Shared by production and real-room tests; payload cap remains unchanged. */
export const browserSocketOptions = {
  maxPayload: 2048,
  pingInterval: 3000,
  // Browser map transitions produced a measured ~9s pong gap. Keep probing
  // every 3s, but require five missed probes before treating a silent socket
  // as dead. Explicit close/drop events still reach the room immediately.
  pingMaxRetries: 5,
};
