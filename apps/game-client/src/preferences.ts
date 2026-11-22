export interface Preferences {
  volume: number;
  musicVolume: number;
  autoBasic: boolean;
  controls: 'keyboard' | 'mouse';
}

const key = 'volam:preferences';
const defaults: Preferences = {
  volume: 52,
  musicVolume: 45,
  autoBasic: false,
  controls: 'keyboard',
};

export function parsePreferences(saved: any): Preferences {
  const valid = (n: unknown): n is number =>
    Number.isInteger(n) && Number(n) >= 0 && Number(n) <= 100;
  const legacy = valid(saved?.volume) ? saved.volume : 45;
  return {
    volume: valid(saved?.musicVolume)
      ? valid(saved?.volume)
        ? saved.volume
        : defaults.volume
      : Math.min(100, Math.round(legacy * 1.15)),
    musicVolume: valid(saved?.musicVolume) ? saved.musicVolume : legacy,
    autoBasic: saved?.autoBasic === true,
    controls: saved?.controls === 'mouse' ? 'mouse' : 'keyboard',
  };
}

function loadPreferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
    return parsePreferences(saved);
  } catch {
    return { ...defaults };
  }
}

export const preferences = loadPreferences();

export function savePreferences(): void {
  try {
    localStorage.setItem(key, JSON.stringify(preferences));
  } catch {
    // Settings still apply to the current session when storage is unavailable.
  }
}
