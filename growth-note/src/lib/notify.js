// サーバーエラーを Slack / Discord などの Webhook に知らせる。
// 同じ内容が続いても通知が洪水にならないよう、1分に1回までにまとめる。

export function createNotifier(url, { log = console, intervalMs = 60_000 } = {}) {
  let last = 0;
  let suppressed = 0;
  return async function notify(message) {
    if (!url) return;
    const now = Date.now();
    if (now - last < intervalMs) {
      suppressed++;
      return;
    }
    last = now;
    const text = `[Growth Note] ${message}${suppressed ? `（ほか${suppressed}件のエラーを省略）` : ''}`.slice(0, 1800);
    suppressed = 0;
    try {
      // Slack は text、Discord は content を読む
      await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, content: text }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      log.error?.('[notify] failed', err.message);
    }
  };
}
