document.addEventListener('DOMContentLoaded', () => {
  setupAiSuggestButton();
  setupScoreChartTooltip();
  setupUploadGuard();
});

function setupAiSuggestButton() {
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
}

function setupScoreChartTooltip() {
  const tooltip = document.getElementById('chart-tooltip');
  const points = document.querySelectorAll('.chart-point');
  if (!tooltip || !points.length) return;

  points.forEach((pt) => {
    pt.addEventListener('mouseenter', (e) => showTooltip(e, pt));
    pt.addEventListener('mousemove', (e) => showTooltip(e, pt));
    pt.addEventListener('mouseleave', () => {
      tooltip.hidden = true;
    });
  });

  function showTooltip(e, pt) {
    const date = pt.getAttribute('data-date');
    const score = pt.getAttribute('data-score');
    const course = pt.getAttribute('data-course');
    tooltip.textContent = `${date} ${course} スコア ${score}`;
    tooltip.style.left = `${e.clientX}px`;
    tooltip.style.top = `${e.clientY}px`;
    tooltip.hidden = false;
  }
}

// Warn before submitting an oversized video so the form doesn't just hang
// on a slow connection with no feedback.
function setupUploadGuard() {
  const input = document.querySelector('input[type="file"][name="videos"]');
  const form = input ? input.closest('form') : null;
  if (!input || !form) return;

  const MAX_BYTES = 60 * 1024 * 1024; // keep in sync with server.js MAX_VIDEO_BYTES

  form.addEventListener('submit', (e) => {
    const oversized = Array.from(input.files || []).filter((f) => f.size > MAX_BYTES);
    if (oversized.length) {
      e.preventDefault();
      alert(
        `動画ファイルが大きすぎます(上限60MB): ${oversized.map((f) => f.name).join(', ')}\n` +
          'スマホの設定で解像度を下げるか、短く撮影してからお試しください。'
      );
      return;
    }
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn && input.files && input.files.length) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'アップロード中...(動画がある場合は時間がかかります)';
    }
  });
}
