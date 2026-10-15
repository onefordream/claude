// メール送信。Resend の API を依存パッケージなしで呼ぶ。
// キーが未設定のとき（開発・テスト）は送らずにログへ出し、outbox に残す。

export function createMailer({ resendApiKey, from }, { log = console } = {}) {
  const outbox = [];
  return {
    enabled: !!resendApiKey,
    outbox,
    async send({ to, subject, text }) {
      if (!resendApiKey) {
        outbox.push({ to, subject, text });
        if (outbox.length > 50) outbox.shift();
        log.info?.(`[mail:dev] to=${to} subject=${subject}\n${text}`);
        return { dev: true };
      }
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${resendApiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject, text }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`mail send failed: ${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`);
      return res.json();
    },
  };
}
