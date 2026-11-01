import { inputBindings } from '@volam/game-data';
import type { Command } from '@volam/game-core';
export function bindGameplayInput(
  send: (command: Command) => void,
  connected: () => boolean,
  blocked: () => boolean = () => false,
  interact: () => void = () => {},
): () => void {
  const held = new Set<string>();
  const move = (): void =>
    send({
      kind: 'move',
      x: Number(held.has('ArrowRight')) - Number(held.has('ArrowLeft')),
      y: Number(held.has('ArrowDown')) - Number(held.has('ArrowUp')),
    });
  const stop = (): void => {
    held.clear();
    if (connected()) move();
  };
  const typing = (target: EventTarget | null): boolean =>
    target instanceof HTMLElement &&
    (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) ||
      target.isContentEditable);
  const keydown = (event: KeyboardEvent): void => {
    if (!connected() || blocked() || typing(event.target)) return;
    if (inputBindings.movement.some((key) => key === event.code)) {
      event.preventDefault();
      if (!held.has(event.code)) {
        held.add(event.code);
        move();
      }
      return;
    }
    if (event.repeat) return;
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
    if (event.code === inputBindings.basicAttack) {
      event.preventDefault();
      send({ kind: 'basic' });
    }
    const slot = inputBindings.activeSkills.findIndex(
      (key) => key === event.code,
    );
    if (slot >= 0) {
      event.preventDefault();
      send({ kind: 'cast', slot });
    }
  };
  const keyup = (event: KeyboardEvent): void => {
    if (held.delete(event.code) && connected()) {
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
