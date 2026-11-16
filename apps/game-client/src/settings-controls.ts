import markerArt from './controls-art/move-marker.png?url';
import cursorArt from './controls-art/cursor.png?url';
import {
  preferences,
  savePreferences,
  type Preferences,
} from './preferences.js';

function controlsHelp(): string {
  return preferences.controls === 'mouse'
    ? 'Chuột phải xuống đất · Di chuyển. A hoặc chuột phải lên địch trong tầm · Đánh thường.'
    : 'Dùng phím mũi tên để đi và A để đánh thường.';
}

export function settingsControls(id: string, withPreview = false): string {
  return `<div class="book-paper settings-sheet">
       <div class="settings-row"><label for="${id}-volume">Âm lượng</label><div class="volume-control"><input id="${id}-volume" type="range" min="0" max="100" value="${preferences.volume}"><output for="${id}-volume">${preferences.volume}%</output></div></div>
       <div class="settings-row"><label for="${id}-auto-basic">Tự đánh thường</label><label class="game-toggle"><input id="${id}-auto-basic" type="checkbox" role="switch" ${preferences.autoBasic ? 'checked' : ''}><span aria-hidden="true"></span></label><p>Đánh địch PvE gần nhất trong tầm, kể cả boss. Bạn vẫn tự thi triển võ công.</p></div>
       <fieldset class="settings-row"><legend>Điều khiển</legend><div class="control-modes">${(['keyboard', 'mouse'] as const).map((mode) => `<label><input type="radio" name="${id}-controls" value="${mode}" ${preferences.controls === mode ? 'checked' : ''}><span>${mode === 'keyboard' ? 'Bàn phím' : 'Chuột'}</span></label>`).join('')}</div>
       <p class="control-note">${controlsHelp()}</p></fieldset>
       ${withPreview ? `<div class="control-preview"><span><img src="${cursorArt}" alt="">Con trỏ</span><span><img src="${markerArt}" alt="">Điểm di chuyển</span></div>` : ''}
    </div>`;
}

export function bindSettings(
  root: HTMLElement,
  id: string,
  onChange: (key: keyof Preferences) => void,
): void {
  const volume = root.querySelector<HTMLInputElement>('#' + id + '-volume')!;
  const auto = root.querySelector<HTMLInputElement>('#' + id + '-auto-basic')!;
  const save = (key: keyof Preferences) => {
    savePreferences();
    onChange(key);
  };
  volume.addEventListener('input', () => {
    preferences.volume = volume.valueAsNumber;
    root.querySelector('output')!.textContent = `${preferences.volume}%`;
    save('volume');
  });
  auto.addEventListener('change', () => {
    preferences.autoBasic = auto.checked;
    save('autoBasic');
  });
  for (const radio of root.querySelectorAll<HTMLInputElement>(
    `input[name="${id}-controls"]`,
  )) {
    radio.addEventListener('change', () => {
      preferences.controls = radio.value === 'mouse' ? 'mouse' : 'keyboard';
      root.querySelector('.control-note')!.textContent = controlsHelp();
      save('controls');
    });
  }
}
