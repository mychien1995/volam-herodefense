/** No frame/event stream: bounded network counts and slowest resources only. */
export async function profileQaPage(page) {
  const groups = new Map(),
    slowest = [];
  const finish = (request) => {
    const t = request.timing();
    if (t.responseEnd < 0) return;
    const url = new URL(request.url()),
      key = request.resourceType();
    const row = groups.get(key) ?? { count: 0, milliseconds: 0 };
    row.count++;
    row.milliseconds += t.responseEnd;
    groups.set(key, row);
    slowest.push({ path: url.pathname, milliseconds: t.responseEnd });
    slowest.sort((a, b) => b.milliseconds - a.milliseconds);
    slowest.length = Math.min(slowest.length, 10);
  };
  await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
  page.on('requestfinished', finish);
  return async () => {
    page.off('requestfinished', finish);
    const navigation = await page
      .evaluate(() =>
        performance.getEntriesByType('navigation').map((t) => ({
          responseEnd: t.responseEnd,
          domContentLoadedEventEnd: t.domContentLoadedEventEnd,
          loadEventEnd: t.loadEventEnd,
        })),
      )
      .catch((error) => ({ error: error.message }));
    return {
      groups: Object.fromEntries(groups),
      slowest,
      navigation,
      limits:
        'Parallel request times are not additive critical-path time. Paths exclude queries; no response content is collected.',
    };
  };
}
