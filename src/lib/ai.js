// Thin wrapper around the Anthropic Messages API using the built-in fetch (Node 22+).
// No SDK dependency, since this environment has no npm registry access.

const API_URL = 'https://api.anthropic.com/v1/messages';

function getConfig() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
  return { apiKey, model };
}

export function isAiConfigured() {
  return Boolean(getConfig().apiKey);
}

async function callClaude({ system, messages, maxTokens = 1024 }) {
  const { apiKey, model } = getConfig();
  if (!apiKey) {
    const err = new Error('ANTHROPIC_API_KEY is not configured');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Anthropic API error ${res.status}: ${text.slice(0, 500)}`);
    err.code = 'AI_REQUEST_FAILED';
    throw err;
  }

  const data = await res.json();
  const textBlock = (data.content || []).find((b) => b.type === 'text');
  return textBlock ? textBlock.text : '';
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// Summarize a single lesson record the student wrote themselves, and pull out
// concrete next-time practice issues.
export async function summarizeLessonRecord({ content, notes }) {
  const system =
    'あなたはインドアゴルフスクールのベテランコーチのアシスタントです。' +
    '生徒が自分で書いたレッスン後の練習記録(カルテ)を読み、' +
    '前向きで簡潔な日本語で要約し、次回取り組むべき課題を抽出してください。' +
    '出力は必ず次のJSON形式のみで返してください(説明文は不要): ' +
    '{"summary": "3〜4文程度の要約", "next_issues": "次回の練習で意識すべき課題を箇条書き風の短い文章で"}';

  const userText = [`【練習内容】\n${content}`, notes ? `【気づき・メモ】\n${notes}` : null]
    .filter(Boolean)
    .join('\n\n');

  const raw = await callClaude({
    system,
    messages: [{ role: 'user', content: userText }],
    maxTokens: 600,
  });

  const parsed = extractJson(raw);
  if (parsed && parsed.summary) {
    return {
      summary: parsed.summary,
      nextIssues: parsed.next_issues || '',
    };
  }
  return { summary: raw.trim(), nextIssues: '' };
}

// Suggest what to practice today, based on recent lesson records and round history.
export async function suggestPractice({ studentName, records, rounds }) {
  const system =
    'あなたはインドアゴルフスクール「GOLF STUDIO SHADOW」に伴走するAIゴルフコーチです。' +
    '生徒の直近のレッスン記録とラウンド記録の履歴をもとに、' +
    '今日一人で練習する際に取り組むべき具体的な練習メニューを日本語で提案してください。' +
    '過去の課題の積み重ねを踏まえ、優先順位をつけて3つ程度、実践しやすい形で提示してください。' +
    '励ましのひとことも添えてください。Markdownの見出し記号(#)は使わず、箇条書きには「・」を使ってください。';

  const recordsText = records.length
    ? records
        .map(
          (r, i) =>
            `${i + 1}. [${r.record_date}] 練習内容: ${r.content}\n   要約: ${r.ai_summary || '(未生成)'}\n   次回の課題: ${r.ai_next_issues || '(なし)'}`
        )
        .join('\n')
    : '(まだレッスン記録がありません)';

  const roundsText = rounds.length
    ? rounds
        .map((r) => `- [${r.round_date}] ${r.course_name} スコア:${r.score ?? '-'} 課題:${r.issues || 'なし'}`)
        .join('\n')
    : '(まだラウンド記録がありません)';

  const userText = `生徒名: ${studentName}\n\n【直近のレッスン記録】\n${recordsText}\n\n【直近のラウンド記録】\n${roundsText}\n\n今日の一人練習で取り組むべきメニューを提案してください。`;

  return callClaude({
    system,
    messages: [{ role: 'user', content: userText }],
    maxTokens: 700,
  });
}
