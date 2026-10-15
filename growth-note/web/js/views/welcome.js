import { api } from '../api.js';
import { html, mount } from '../ui.js';

// ログイン前の紹介ページ。何ができるか・料金・よくある質問を1ページで伝え、無料登録へ案内する。

const FEATURES = [
  { title: '30秒で残せる', text: '一文・写真・動画・声のどれでも記録できます。書く負担を小さくして、続けられる形にしました。' },
  { title: 'AIと振り返る', text: '記録するたびに、AIが要約と気づき、次の一歩をまとめます。' },
  { title: '変化が数字で見える', text: '連続日数、成長レベル、6つの指標の推移で、自分の変化を確かめられます。' },
  { title: 'ゴルフのスコア分析', text: 'ラウンドを数タップで記録。パット・方向性・アプローチのどこで何打失っているかを示します。' },
  { title: '教室・コーチと共有', text: '店舗IDを入力するだけで、通っている教室と連携。先生から記録にコメントが届きます。' },
  { title: 'データはあなたのもの', text: '共有する記録は自分で選べます。広告への利用や販売はしません。' },
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
    <header class="lp-nav">
      <span class="wordmark">Growth Note</span>
      <a class="text-btn" href="#/login">ログイン</a>
    </header>

    <section class="lp-hero">
      <p class="eyebrow">成長記録ノート</p>
      <h1 class="lp-title">毎日の記録を、<br>成長の資産に。</h1>
      <p class="lp-lead">記録して、AIと振り返り、変化を数字で確かめる。続けるための仕組みを、ひとつのノートにまとめました。</p>
      <div class="lp-cta">
        <a class="btn btn-primary btn-lg" href="#/signup">無料で始める</a>
        <p class="hint">メールアドレスだけで登録できます。クレジットカードは不要です。</p>
      </div>
    </section>

    <section class="lp-section">
      <h2 class="section-title">できること</h2>
      <ol class="feature-list">${FEATURES.map((f, i) => html`
        <li><span class="feature-no num">${String(i + 1).padStart(2, '0')}</span><div><h3>${f.title}</h3><p>${f.text}</p></div></li>`)}
      </ol>
    </section>

    <section class="lp-section">
      <h2 class="section-title">使い方</h2>
      <ol class="steps steps-lg">
        <li><b>記録する</b>　今日やったこと、気づいたことを一文で。</li>
        <li><b>振り返る</b>　AIが要約と、次にやることを返します。</li>
        <li><b>確かめる</b>　連続日数とグラフで、変化を確認します。</li>
      </ol>
    </section>

    <section class="lp-section">
      <h2 class="section-title">料金</h2>
      <div class="plan-table">
        <div class="plan-col">
          <p class="plan-name">フリー</p>
          <p class="plan-price"><span class="num">0</span>円</p>
          <p class="plan-desc">記録・継続日数・目標・教室との連携・ゴルフのスコアカード</p>
        </div>
        <div class="plan-col">
          <p class="plan-name">プロ</p>
          <p class="plan-price"><span class="num">${pricing.month.amount}</span>円<small> / 月</small></p>
          <p class="plan-desc">年額${pricing.year.amount.toLocaleString('ja-JP')}円（2か月分お得）。AI分析・成長グラフ・ゴルフAIコーチ</p>
        </div>
      </div>
      <p class="hint">プロは${pricing.trialDays}日間無料で試せます。価格は税込です。</p>
    </section>

    <section class="lp-section">
      <h2 class="section-title">よくある質問</h2>
      <div class="faq">${FAQ.map(([q, a]) => html`<details class="disclosure"><summary>${q}</summary><p>${a}</p></details>`)}</div>
    </section>

    <section class="lp-section lp-final">
      <p class="lp-final-title">今日の一文から始める。</p>
      <a class="text-btn" href="#/signup">アカウントを作成</a>
    </section>

    <footer class="lp-footer">
      <nav class="footer-links"><a href="#/legal/terms">利用規約</a><a href="#/legal/privacy">プライバシーポリシー</a><a href="#/legal/tokushoho">特定商取引法に基づく表記</a></nav>
      <p class="hint">Growth Note</p>
    </footer>`);
}
