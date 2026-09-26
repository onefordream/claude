// APIキーが未設定のとき・利用上限に達したとき・AI呼び出しが失敗し続けたときに使う簡易分析。
// ルールベースだが、ユーザーが「何も返ってこない」状態にならないことを優先する。

const TOPICS = [
  { tag: '運動', re: /筋トレ|トレーニング|ラン|走|ジム|ストレッチ|ヨガ|ウォーキング|歩|スクワット|腕立て|泳|運動|ゴルフ|テニス|サッカー/ },
  { tag: '学習', re: /勉強|学習|資格|試験|問題集|単語|英語|講座|復習|予習|授業|プログラミング/ },
  { tag: '読書', re: /読書|本を読|読んだ|読了|小説|漫画/ },
  { tag: '仕事', re: /仕事|副業|案件|会議|企画|納品|提案|営業|作業/ },
  { tag: '健康', re: /睡眠|寝|食事|ダイエット|体重|健康|水を|禁酒|自炊/ },
  { tag: '創作', re: /絵|描|書いた|執筆|ブログ|動画編集|デザイン|作品|制作/ },
  { tag: '音楽', re: /ギター|ピアノ|練習曲|歌|楽器|ベース|ドラム|演奏|コード/ },
  { tag: 'こころ', re: /気持ち|不安|嬉し|楽し|悲し|感謝|落ち込|イライラ|モヤモヤ|ほっと/ },
];

const clip = (s, n) => ([...s].length > n ? [...s].slice(0, n - 1).join('') + '…' : s);

export function localEntryInsight({ entry, mediaCounts = {}, goal = null, streak = 0 }) {
  const text = (entry.body || '').trim();
  const first = text.split(/(?<=[。．！!？?\n])/)[0]?.trim() || '';
  const mediaDesc = [
    mediaCounts.image && `写真${mediaCounts.image}枚`,
    mediaCounts.video && `動画${mediaCounts.video}本`,
    mediaCounts.audio && `音声メモ${mediaCounts.audio}件`,
  ].filter(Boolean).join('・');
  const summary = first ? clip(first.replace(/\s+/g, ' '), 60) : mediaDesc ? `${mediaDesc}を記録しました。` : '今日の記録を残しました。';

  const insights = [];
  if (/できた|達成|成功|クリア|更新|自己ベスト/.test(text)) insights.push('「できたこと」を言葉にできています。小さな成功の積み重ねが自信になります。');
  if (/難し|できなかった|失敗|悔し|うまくいかな|苦手/.test(text)) insights.push('課題が見えているのは前進のサインです。次に試すことを1つだけ決めておくと動きやすくなります。');
  if (entry.mood >= 4) insights.push('気分の良い一日だったようです。何が良かったのかを覚えておくと、次も再現しやすくなります。');
  if (entry.mood && entry.mood <= 2) insights.push('少ししんどい日だったようです。そんな日にも記録を残せたこと自体が大きな一歩です。');
  if (streak >= 2) insights.push(`${streak}日連続で記録できています。続けていること自体が力になっています。`);
  if (mediaDesc) insights.push('写真や音声で残しておくと、あとで変化を見比べやすくなります。');
  if ([...text].length >= 150) insights.push('しっかり言葉にできています。書くことで考えが整理されていきます。');
  if (!insights.length) insights.push('今日も自分の時間を記録に残せました。短い記録でも、積み重なると大きな資産になります。');

  const nextActions = [];
  if (goal) nextActions.push(`「${goal.title}」を今日も少しだけ進める（5分でもOK）`);
  if (/難し|できなかった|失敗|苦手/.test(text)) nextActions.push('うまくいかなかった点を1つ選んで、やり方を少し変えて試してみる');
  if (/疲|眠|だる/.test(text)) nextActions.push('今日は早めに休んで、明日のために体力を回復する');
  nextActions.push('明日やることを1つだけ決めておく');
  nextActions.push('同じ時間帯に記録して、習慣のリズムをつくる');

  const tags = TOPICS.filter((t) => t.re.test(text)).map((t) => t.tag).slice(0, 3);

  const encouragement =
    streak >= 7 ? `${streak}日連続、すばらしい積み重ねです。` :
    streak >= 2 ? 'いい流れができています。この調子で。' :
    '記録おつかれさまでした。また明日も一言残しましょう。';

  return {
    summary,
    insights: insights.slice(0, 3),
    next_actions: nextActions.slice(0, 3),
    encouragement,
    tags,
  };
}

export function localWeeklyReview({ entries, activeDays, streak }) {
  const tagCount = new Map();
  for (const e of entries) for (const t of TOPICS) if (t.re.test(e.body || '')) tagCount.set(t.tag, (tagCount.get(t.tag) || 0) + 1);
  const topTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  const highlights = entries
    .filter((e) => (e.body || '').trim())
    .slice(-3)
    .map((e) => clip((e.ai_summary || e.body).replace(/\s+/g, ' '), 50));
  return {
    summary: entries.length
      ? `この1週間で${activeDays}日、${entries.length}件の記録を残しました。${topTags.length ? `中心は「${topTags.slice(0, 2).join('」「')}」でした。` : ''}`
      : 'この1週間は記録がありませんでした。今日の一言から再スタートしましょう。',
    highlights,
    patterns: [
      activeDays >= 5 ? '記録する習慣がしっかり定着しています。' : activeDays >= 3 ? '週の半分ほど記録できています。あと1日増やせると習慣が安定します。' : '記録できた日が少なめでした。時間を決めておくと続けやすくなります。',
      ...(streak >= 3 ? [`現在${streak}日連続で記録中です。`] : []),
    ],
    next_week_focus: ['記録する時間帯を決めておく', ...(topTags[0] ? [`「${topTags[0]}」で、来週達成したい小さな目標を1つ決める`] : ['来週取り組みたいことを1つ目標に登録する'])],
    encouragement: '1週間おつかれさまでした。来週も自分のペースでいきましょう。',
  };
}
