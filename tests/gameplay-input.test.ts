import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { bindGameplayInput } from '../apps/game-client/src/input.js';

class ElementStub extends EventTarget {
  tagName = 'CANVAS';
  isContentEditable = false;
}
let unbind: () => void;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('HTMLElement', ElementStub);
  vi.stubGlobal('window', Object.assign(new EventTarget(), { setInterval }));
  vi.stubGlobal(
    'document',
    Object.assign(new EventTarget(), { hidden: false }),
  );
});
afterEach(() => {
  unbind?.();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function key(
  type: string,
  code: string,
  props = {},
  target: EventTarget = window,
) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, {
    code,
    key: 'Process',
    keyCode: 229,
    repeat: false,
    ...props,
  });
  target.dispatchEvent(event);
  return event;
}

test('IME missing keydown still casts W/R once on physical key release', () => {
  const send = vi.fn();
  unbind = bindGameplayInput(send, () => true);
  for (const code of ['KeyW', 'KeyR']) {
    key('keydown', '', { isComposing: true });
    key('keyup', code);
  }
  expect(send.mock.calls.map(([command]) => command)).toEqual([
    { kind: 'cast', slot: 1 },
    { kind: 'cast', slot: 3 },
  ]);
});

test('ordinary and composing physical keydowns do not cast twice on release', () => {
  const send = vi.fn();
  unbind = bindGameplayInput(send, () => true);
  for (const code of ['KeyW', 'KeyR']) {
    key('keydown', code, { isComposing: true });
    key('keydown', code, { repeat: true });
    key('keyup', code);
  }
  expect(send).toHaveBeenCalledTimes(2);
});

test('a key pressed while a menu blocks input cannot cast after it closes', () => {
  const send = vi.fn();
  let blocked = true;
  unbind = bindGameplayInput(
    send,
    () => true,
    () => blocked,
  );
  key('keydown', 'KeyW');
  blocked = false;
  key('keyup', 'KeyW');
  expect(send).not.toHaveBeenCalled();
});

test('orphan releases respect menus, connection state and browser shortcuts', () => {
  const send = vi.fn();
  let connected = true;
  let blocked = true;
  unbind = bindGameplayInput(
    send,
    () => connected,
    () => blocked,
  );
  key('keyup', 'KeyW');
  blocked = false;
  connected = false;
  key('keyup', 'KeyR');
  connected = true;
  key('keyup', 'KeyW', { ctrlKey: true });
  expect(send).not.toHaveBeenCalled();
});
