import { nicknameSchema } from '@volam/game-protocol';

const key = 'volam:nickname';
let sessionName = '';

export function readPlayerName(): string {
  try {
    const parsed = nicknameSchema.safeParse(localStorage.getItem(key));
    if (parsed.success) sessionName = parsed.data;
  } catch {
    // Keep the current session usable when browser storage is unavailable.
  }
  return sessionName;
}

export function rememberPlayerName(value: string): void {
  const parsed = nicknameSchema.safeParse(value);
  if (!parsed.success) return;
  sessionName = parsed.data;
  try {
    localStorage.setItem(key, sessionName);
  } catch {
    // The name still carries between modes in this session.
  }
}
