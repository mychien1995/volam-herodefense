import { inputBindings } from '@volam/game-data';
import type { Command } from '@volam/game-core';
export function bindGameplayInput(
  send: (command: Command) => void,
  connected: () => boolean,
  blocked: () => boolean = () => false,
  interact: () => void = () => {},
  usePotion: (resource: 'hp' | 'mp') => void = () => {},
  spectator?: { active: () => boolean; pan: (x: number, y: number) => void },
  capture: (
    key: string,
  ) =>
    | Omit<Extract<Command, { kind: 'nam-de-key' }>, 'kind'>
    | null
    | undefined = () => undefined,
  switchStance: () => void = () => {},
  skillUpgrade?: { enabled: () => boolean; upgrade: (slot: number) => void },
  mouseMode: () => boolean = () => false,
): () => void {
  const held = new Set<string>();
  let learning = false;
  const move = (): void =>
    spectator?.active()
      ? spectator.pan(
          Number(held.has('ArrowRight')) - Number(held.has('ArrowLeft')),
          Number(held.has('ArrowDown')) - Number(held.has('ArrowUp')),
        )
      : send({
          kind: 'move',
          x: Number(held.has('ArrowRight')) - Number(held.has('ArrowLeft')),
          y: Number(held.has('ArrowDown')) - Number(held.has('ArrowUp')),
        });
  const stop = (): void => {
    held.clear();
    learning = false;
    if (connected()) move();
  };
  const typing = (target: EventTarget | null): boolean =>
    target instanceof HTMLElement &&
    (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) ||
      target.isContentEditable);
  const keydown = (event: KeyboardEvent): void => {
    if (!connected()) return;
    const qte = capture(event.repeat ? '' : event.code);
    if (qte !== undefined) {
      event.preventDefault();
      if (qte) send({ kind: 'nam-de-key', ...qte });
      return;
    }
    if (blocked() || typing(event.target)) return;
    const slot = inputBindings.activeSkills.findIndex(
      (key) => key === event.code,
    );
    if (
      event.code === 'KeyO' &&
      skillUpgrade?.enabled() &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      if (!event.repeat) learning = true;
      return;
    }
    if (slot >= 0 && learning && skillUpgrade?.enabled()) {
      event.preventDefault();
      if (!event.repeat) skillUpgrade.upgrade(slot);
      return;
    }
    if (inputBindings.movement.some((key) => key === event.code)) {
      event.preventDefault();
      if (mouseMode() && !spectator?.active()) return;
      if (!held.has(event.code)) {
        held.add(event.code);
        move();
      }
      return;
    }
    if (event.repeat) return;
    if (spectator?.active()) {
      if (event.code === 'Space') {
        event.preventDefault();
        interact();
      }
      return;
    }
    const potion = inputBindings.healthPotion.some((key) => key === event.code)
      ? 'hp'
      : inputBindings.manaPotion.some((key) => key === event.code)
        ? 'mp'
        : undefined;
    if (potion) {
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey)
        return;
      event.preventDefault();
      usePotion(potion);
      return;
    }
    if (inputBindings.dash.some((key) => key === event.code)) {
      event.preventDefault();
      send({ kind: 'dash' });
      return;
    }
    if (event.code === 'Space') {
      event.preventDefault();
      interact();
      return;
    }
    if (
      event.code === inputBindings.stance &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      switchStance();
      return;
    }
    if (event.code === inputBindings.basicAttack) {
      event.preventDefault();
      send({ kind: 'basic' });
    }
    if (
      event.code === 'KeyS' &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      send({ kind: 'tam-lien-tram' });
      return;
    }
    if (slot >= 0) {
      event.preventDefault();
      send({ kind: 'cast', slot });
    }
  };
  const keyup = (event: KeyboardEvent): void => {
    if (event.code === 'KeyO') learning = false;
    if (
      held.delete(event.code) &&
      connected() &&
      (!mouseMode() || spectator?.active())
    ) {
      event.preventDefault();
      move();
    }
  };
  const focus = (event: FocusEvent): void => {
    if (typing(event.target)) stop();
  };
  const visibility = (): void => {
    if (document.hidden) stop();
  };
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', stop);
  window.addEventListener('volam:controls-blocked', stop);
  document.addEventListener('focusin', focus);
  document.addEventListener('visibilitychange', visibility);
  const heartbeat = window.setInterval(() => {
    if (blocked() && held.size) stop();
    else if (mouseMode() && !spectator?.active()) held.clear();
    else if (connected() && held.size) move();
  }, 100);
  return () => {
    clearInterval(heartbeat);
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
    window.removeEventListener('blur', stop);
    window.removeEventListener('volam:controls-blocked', stop);
    document.removeEventListener('focusin', focus);
    document.removeEventListener('visibilitychange', visibility);
  };
}
