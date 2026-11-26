const ids = new Map<string, HTMLElement>();
/** Only unique IDs are cached; detached menu/viewport nodes are resolved again. */
export function findElement<T extends HTMLElement>(selector: string): T | null {
  const id = /^#[\w-]+$/.test(selector);
  const cached = id ? ids.get(selector) : undefined;
  if (cached?.isConnected && cached.ownerDocument === document)
    return cached as T;
  const found = document.querySelector<T>(selector);
  if (id) {
    if (found) ids.set(selector, found);
    else ids.delete(selector);
  }
  return found;
}
export function setText(node: Element, value: string): void {
  if (node.textContent !== value) node.textContent = value;
}
export function setAttribute(node: Element, name: string, value: string): void {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}
export function setProperty<T, K extends keyof T>(
  node: T,
  key: K,
  value: T[K],
): void {
  if (node[key] !== value) node[key] = value;
}
const styles = new WeakMap<
  CSSStyleDeclaration,
  Map<string, { input: string; output: string }>
>();
/** CSS normalizes shorthand values; compare the last normalized output as well as input. */
export function setStyle<K extends keyof CSSStyleDeclaration>(
  style: CSSStyleDeclaration,
  key: K,
  value: CSSStyleDeclaration[K] & string,
): void {
  const saved = styles.get(style)?.get(String(key));
  if (saved?.input === value && saved.output === style[key]) return;
  if (style[key] !== value) style[key] = value;
  let fields = styles.get(style);
  if (!fields) styles.set(style, (fields = new Map()));
  fields.set(String(key), { input: value, output: String(style[key]) });
}
