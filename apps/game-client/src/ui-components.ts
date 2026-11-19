/** Markup only: callers retain focus, pending-state and server acknowledgement ownership. */
export const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );

export type ActionAttribute = 'data-action' | 'data-pvp' | 'data-practice';
export interface UiAction {
  label: string;
  action: string;
  disabled?: boolean;
}

export function actionButton(
  { label, action, disabled = false }: UiAction,
  attribute: ActionAttribute = 'data-action',
): string {
  return `<button type="button" ${attribute}="${escapeHtml(action)}" ${disabled ? 'disabled' : ''}>${escapeHtml(label)}</button>`;
}

export function actionRow(
  actions: readonly UiAction[],
  attribute: ActionAttribute,
): string {
  return `<div class="pre-actions">${actions.map((action) => actionButton(action, attribute)).join('')}</div>`;
}
