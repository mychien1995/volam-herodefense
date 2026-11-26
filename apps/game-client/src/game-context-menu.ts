/** Block native right-click actions throughout the active game viewport. */
export function bindGameContextMenu(
  viewport: HTMLElement,
  active: () => boolean,
): () => void {
  const suppress = (event: MouseEvent): void => {
    if (!active()) return;
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.closest('input, textarea, select, [contenteditable="true"]')
    )
      return;
    if (event.type === 'contextmenu' || event.button === 2)
      event.preventDefault();
  };
  const events = [
    'contextmenu',
    'pointerdown',
    'mousedown',
    'auxclick',
  ] as const;
  for (const event of events) viewport.addEventListener(event, suppress, true);
  return () => {
    for (const event of events)
      viewport.removeEventListener(event, suppress, true);
  };
}
