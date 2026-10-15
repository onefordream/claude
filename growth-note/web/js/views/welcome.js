import { api } from '../api.js';
import { html, mount } from '../ui.js';
import { icon } from '../icons.js';

// ログイン前の紹介ページ。何ができるか・料金・よくある質問を1ページで伝え、無料登録へ案内する。

const FEATURES = [
  { icon: '✏️', title: '30秒で記録', text: '一言・写真・動画・声でOK。書く負担を最小にして、毎日続けられる形にしました。' },
  { icon: '✨', title: 'AIが伴走', text: '記録するたびに、AIが要約と気づき、次の一歩を返してくれます。' },
  { icon: '📈', title: '成長が見える', text: '続けた日数、成長レベル、6つの指標のグラフで、自分の変化がひと目でわかります。' },
  { icon: '⛳', title: 'ゴルフのスコア分析', text: 'ラウンドを数タップで記録。パター・方向性・アプローチのどこで何打損しているかを分析します。' },
  { icon: '🤝', title: '教室・コーチと共有', text: '店舗IDを入れるだけで、通っている教室と連携。先生から記録にコメントがもらえます。' },
  { icon: '🔒', title: 'データはあなたのもの', text: '共有する記録は自分で選べます。広告に使ったり、販売したりはしません。' },
];

const FAQ = [
  ['無料でどこまで使えますか？', '記録・写真・動画・継続日数・目標・検索・教室との連携・ゴルフのスコアカードは、ずっと無料で使えます。AIのふりかえりは3回まで無料で体験できます。'],
  ['プロプランでは何ができますか？', 'AIのふりかえり（毎回）、成長レベルと6つの指標、足りないものの分析、AI自己分析、ゴルフの能力チャートとAIコーチなどが使えます。'],
  ['スマホのアプリですか？', 'ブラウザで動くWebアプリです。ホーム画面に追加すると、アプリのように使えます。'],
  ['どんな記録に使えますか？', '筋トレ、読書、資格の勉強、楽器、ダイエット、仕事の振り返り、日記など、ジャンルを問いません。'],
];

export async function render(root) {
  const { pricing } = await api('/public/config').catch(() => ({ pricing: { month: { amount: 580 }, year: { amount: 5800 }, trialDays: 7 } }));
  mount(root, html`
    <section class="lp-hero">
      <div class="lp-logo">🌱</div>
      <p class="eyebrow">AIが伴走する成長記録ノート</p>
      <h1 class="lp-title">毎日のひとことが、<br>あなたの成長の<br>資産になる。</h1>
      <p class="lp-lead">記録して、AIと振り返って、成長をグラフで見る。<br>続けたくなる仕組みを、ひとつのアプリに。</p>
      <div class="lp-cta">
        <a class="btn btn-primary btn-lg" href="#/signup">無料ではじめる</a>
        <a class="btn btn-ghost" href="#/login">ログイン</a>
      </div>
      <p class="hint center">登録はメールアドレスだけ。クレジットカードは不要です。</p>
    </section>

    <section class="lp-features">${FEATURES.map((f) => html`
      <article class="card lp-feature"><span class="lp-f-icon">${f.icon}</span><div><h2>${f.title}</h2><p>${f.text}</p></div></article>`)}
    </section>

    <section class="card lp-steps">
      <h2 class="card-title">使い方は3ステップ</h2>
      <ol>
        <li><b>記録する</b><span>今日やったこと、気づいたことを一言で。</span></li>
        <li><b>AIと振り返る</b><span>要約と、次にやることが返ってきます。</span></li>
        <li><b>成長を見る</b><span>続けた日数とグラフで、変化を実感。</span></li>
      </ol>
    </section>

    <section class="card lp-pricing">
      <h2 class="card-title">料金</h2>
      <div class="lp-plans">
        <div class="lp-plan"><b>フリー</b><p class="lp-price">0円</p><p class="muted small">記録・継続・目標・教室との連携・ゴルフのスコアカード</p></div>
        <div class="lp-plan pro"><b>プロ</b><p class="lp-price">月${pricing.month.amount}円</p><p class="muted small">年${pricing.year.amount.toLocaleString('ja-JP')}円なら2か月分おトク。AI分析・成長グラフ・ゴルフAIコーチ</p></div>
      </div>
      <p class="hint center">プロは${pricing.trialDays}日間無料で試せます（税込）</p>
    </section>

    <section class="card faq">
      <h2 class="card-title small">よくある質問</h2>
      ${FAQ.map(([q, a]) => html`<details><summary>${q}</summary><p>${a}</p></details>`)}
    </section>

    <section class="lp-final">
      <h2>今日の一言から、はじめよう。</h2>
      <a class="btn btn-primary btn-lg btn-block" href="#/signup">${icon('plus', { size: 20, stroke: 2.6 })}無料ではじめる</a>
    </section>

    <footer class="lp-footer">
      <a href="#/legal/terms">利用規約</a><a href="#/legal/privacy">プライバシーポリシー</a><a href="#/legal/tokushoho">特定商取引法に基づく表記</a>
      <p>© Growth Note</p>
    </footer>`);
}
