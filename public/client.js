document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('ask-ai-btn');
  if (!btn) return;
  const resultBox = document.getElementById('ai-result');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = '考え中...';
    resultBox.hidden = false;
    resultBox.textContent = 'AIコーチが練習履歴を確認しています…';

    try {
      const res = await fetch('/ai/suggest', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        resultBox.textContent = data.suggestion;
      } else {
        resultBox.textContent = data.message || 'AI機能が利用できませんでした。';
      }
    } catch (err) {
      resultBox.textContent = '通信エラーが発生しました。もう一度お試しください。';
    } finally {
      btn.disabled = false;
      btn.textContent = '今日の練習メニューを聞く';
    }
  });
});
