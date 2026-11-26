import { assetUrl } from './asset-url.js';
import { tamLienTram } from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import type { LobbyState } from '@volam/game-protocol';
import './tam-lien-hud.css';

export const tamLienArt = '/assets/skills/thien-son/tam-lien-tram-2026-11-09/';

export class TamLienHud {
  private readonly node = document.createElement('div');
  private readonly timer = document.createElement('span');

  constructor() {
    this.node.id = 'tam-lien-qte';
    this.node.hidden = true;
    this.node.setAttribute('role', 'status');
    this.node.innerHTML = `<img src="${assetUrl(tamLienArt + 'hud-icon.png')}" alt=""><kbd>S</kbd><b>Tam Liên Trảm</b>`;
    this.node.append(this.timer);
    document.querySelector('#hud .hotbar')!.append(this.node);
  }

  sync(state: LobbyState | undefined, id: string) {
    const hero = state?.players.get(id);
    const left = hero?.inventory.tamLienReadyTicks ?? 0;
    this.node.hidden = !(
      state?.phase === 'IN_GAME' &&
      hero?.basicId === tamLienTram.basicId &&
      hero.hp > 0 &&
      left > 0
    );
    if (!this.node.hidden)
      this.timer.style.transform = `scaleX(${Math.min(1, left / (m1Config.tickRate * tamLienTram.windowSeconds))})`;
  }
}
