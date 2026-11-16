export interface Preferences {
  volume: number;
  autoBasic: boolean;
  controls: 'keyboard' | 'mouse';
}

const key = 'volam:preferences';
const defaults: Preferences = {
  volume: 45,
  autoBasic: false,
  controls: 'keyboard',
};

function loadPreferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
    return {
      volume:
        Number.isInteger(saved?.volume) &&
        saved.volume >= 0 &&
        saved.volume <= 100
          ? saved.volume
          : defaults.volume,
      autoBasic: saved?.autoBasic === true,
      controls: saved?.controls === 'mouse' ? 'mouse' : 'keyboard',
    };
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
