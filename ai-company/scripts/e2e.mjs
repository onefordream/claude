// E2E（スマートフォン表示）: 登録 → 面談 → 会社設立 → 社長室 → ミッション完了 → チャット → 会議 → 分離確認
// 使い方: DEV_LOCAL_MODE=1 で起動したサーバーに対して  BASE_URL=http://localhost:3100 node scripts/e2e.mjs
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require("/opt/node-tools/node_modules/playwright");
}
const { chromium, devices } = playwright;

const BASE = process.env.BASE_URL || "http://localhost:3100";
const OUT = process.env.SHOT_DIR || "test-results";
fs.mkdirSync(OUT, { recursive: true });
const stamp = Date.now();
let step = 0;
const ok = (m) => console.log(`✓ ${m}`);
function assert(c, m) {
  if (!c) throw new Error(`ASSERTION FAILED: ${m}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(String(e)));
const shot = (name) => page.screenshot({ path: `${OUT}/${String(++step).padStart(2, "0")}-${name}.png`, fullPage: false, caret: "initial" });

try {
  // ランディング
  await page.goto(BASE);
  await page.getByText("社長になっていた。").waitFor();
  await shot("landing");
  ok("landing");

  // 登録（開発モード）
  await page.goto(`${BASE}/login?mode=signup`);
  await page.getByLabel("メールアドレス").fill(`e2e-${stamp}@example.com`);
  await page.getByRole("button", { name: /登録して会社を設立する/ }).click();
  await page.waitForURL("**/onboarding");
  ok("signup → onboarding");

  // オープニング
  await page.getByText("はじめまして、社長。").waitFor();
  await shot("opening");
  for (let i = 0; i < 12; i++) {
    const start = page.getByRole("button", { name: "面談を始める" });
    if (await start.isVisible().catch(() => false)) {
      await start.click();
      break;
    }
    await page.getByRole("button", { name: /次へ/ }).click();
    await page.waitForTimeout(150);
  }
  await page.getByLabel("社長のお名前").fill("テスト太郎");
  await page.getByRole("button", { name: /この名前で始める/ }).click();
  await page.getByLabel("回答を入力").waitFor();
  await shot("interview-start");
  ok("opening + name");

  // 面談
  const answers = ["好きなことで人を笑顔にしたい", "小さくても愛される会社", "会社員で営業を10年", "人と話すこと、料理", "まだありません", "まだ決まっていません", "まずは月5万円の副業"];
  for (const a of answers) {
    await page.getByLabel("回答を入力").fill(a);
    await page.getByRole("button", { name: "送信" }).click();
    await page.waitForFunction((t) => document.body.innerText.includes(t), a);
    await page.waitForFunction(() => !document.querySelector('button[aria-label="送信"]')?.closest("form")?.querySelector("textarea")?.disabled);
    await page.waitForTimeout(400);
  }
  // 残りはスキップ
  for (let i = 0; i < 4; i++) {
    const go = page.getByRole("button", { name: /会社の設計に進む/ });
    if (await go.isVisible().catch(() => false)) break;
    await page.getByRole("button", { name: /この質問はスキップ/ }).click();
    await page.waitForTimeout(600);
  }
  await shot("interview-done");
  await page.getByRole("button", { name: /会社の設計に進む/ }).click();
  ok("interview");

  // 事業アイデア提案
  await page.getByText("事業アイデアを提案してほしい").click();
  await page.getByText("PLAN A").waitFor({ timeout: 30000 });
  await shot("ideas");
  await page.getByRole("button", { name: "この事業で会社をつくる" }).first().click();
  await page.getByText("社長、会社の設計図ができました").waitFor({ timeout: 60000 });
  await shot("review");
  ok("ideas → plan");

  // 社名を編集して設立
  await page.getByLabel("社名").fill("テストドリーム");
  await page.getByRole("button", { name: /この内容で会社を設立する/ }).click();
  await page.getByText("Congratulations!").waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: /社長室へ出社する/ }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(1200);
  await shot("founded");
  await page.getByRole("button", { name: /社長室へ出社する/ }).click();
  await page.waitForURL("**/office");
  await page.getByText("今日の会社の目標はこちらです").waitFor();
  assert((await page.content()).includes("テストドリーム"), "company name shown in office");
  await shot("office");
  ok("founded → office");

  // ミッション完了
  await page.locator("li button").filter({ hasText: "XP" }).first().click();
  await page.getByRole("dialog").waitFor();
  const done = page.getByRole("button", { name: /ミッション完了/ });
  assert(await done.isDisabled(), "complete disabled without deliverable");
  await page.getByRole("dialog").locator("textarea").fill("競合3社を調べて特徴と価格をメモしました");
  await done.click();
  await page.getByText(/\+50 XP/).waitFor();
  await shot("mission-complete");
  await page.getByRole("button", { name: "閉じる" }).last().click();
  ok("mission completed");

  // 再読み込みでXPが保持されている
  await page.reload();
  await page.getByText("50 XP").first().waitFor();
  ok("xp persisted after reload");

  // 社員一覧 → 企画担当とチャット
  await page.goto(`${BASE}/employees`);
  await page.getByText("人材採用センター").waitFor();
  await shot("employees");
  await page.getByRole("link", { name: /カイト/ }).first().click();
  await page.waitForURL(/\/employees\/[0-9a-f-]+/);
  await page.getByLabel("メッセージを入力").fill("商品の価格はどう決めればいい？");
  await page.getByRole("button", { name: "送信" }).click();
  await page.getByText(/開発用モックAI/).first().waitFor({ timeout: 20000 });
  ok("chat with planner");
  // 業務依頼（成果物）
  await page.getByRole("button", { name: /商品アイデア出し/ }).click();
  await page.getByRole("button", { name: /依頼する/ }).click();
  await page.getByText(/成果物として保存しました/).waitFor({ timeout: 20000 });
  await shot("chat");
  const chatUrl = page.url();
  ok("capability task → artifact");

  // 社内会議
  await page.goto(`${BASE}/meeting`);
  await page.getByLabel("会議のテーマ").fill("月10万円の売上を目指したい");
  await page.getByRole("button", { name: /会議を始める/ }).click();
  await page.getByText("会議のまとめ").waitFor({ timeout: 30000 });
  await shot("meeting");
  ok("meeting");

  // 会社プロフィール
  await page.goto(`${BASE}/company`);
  await page.getByText("実績バッジ").waitFor();
  await shot("company");
  ok("company profile");

  // 設定
  await page.goto(`${BASE}/settings`);
  await page.getByText("ご利用状況").waitFor();
  await shot("settings");
  ok("settings");

  // ===== 別ユーザーからは見えない =====
  const ctx2 = await browser.newContext({ ...devices["iPhone 13"] });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/login`);
  await p2.getByLabel("メールアドレス").fill(`other-${stamp}@example.com`);
  await p2.getByRole("button", { name: /出社する/ }).click();
  await p2.waitForURL("**/onboarding");
  await p2.goto(chatUrl);
  await p2.waitForLoadState("networkidle");
  assert(!p2.url().includes("/employees/"), `other user redirected away from foreign chat (url=${p2.url()})`);
  const empId = chatUrl.split("/").pop();
  const r = await p2.request.post(`${BASE}/api/chat`, { data: { employeeId: empId, message: "のぞき見" } });
  assert(r.status() === 404, `foreign employee chat rejected (status=${r.status()})`);
  await ctx2.close();
  ok("isolation between users");

  // 未ログインの API は 401
  const anon = await browser.newContext();
  const r2 = await anon.request.post(`${BASE}/api/chat`, { data: { employeeId: empId, message: "x" } });
  assert(r2.status() === 401, `anon rejected (status=${r2.status()})`);
  await anon.close();
  ok("unauthenticated API rejected");

  // 一般ユーザーは管理機能を使えない
  const r3 = await page.request.put(`${BASE}/api/admin/settings`, {
    data: { plans: { free: {}, pro: {} }, proPriceJpy: 0, abuseHourlyThreshold: 1 },
  });
  assert(r3.status() === 400 || r3.status() === 403, `non-admin settings rejected (status=${r3.status()})`);
  const r4 = await page.goto(`${BASE}/admin`);
  assert(r4.status() === 404, `non-admin cannot open /admin (status=${r4.status()})`);
  ok("admin area protected");

  // 管理者（ADMIN_EMAILS=admin@example.com で起動）
  const actx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const ap = await actx.newPage();
  await ap.goto(`${BASE}/login`);
  await ap.getByLabel("メールアドレス").fill("admin@example.com");
  await ap.getByRole("button", { name: /出社する/ }).click();
  await ap.waitForURL("**/onboarding");
  await ap.goto(`${BASE}/admin`);
  await ap.getByText("管理者ダッシュボード").waitFor();
  await ap.getByText("本日のAI呼び出し").waitFor();
  await ap.screenshot({ path: `${OUT}/${String(++step).padStart(2, "0")}-admin-desktop.png`, caret: "initial" });
  await actx.close();
  ok("admin dashboard for admin");

  // PC 表示の社長室
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, storageState: await ctx.storageState() });
  const dp = await dctx.newPage();
  await dp.goto(`${BASE}/office`);
  await dp.getByText("今日の会社の目標はこちらです").waitFor();
  await dp.screenshot({ path: `${OUT}/${String(++step).padStart(2, "0")}-office-desktop.png`, caret: "initial" });
  await dctx.close();
  ok("desktop office");

  // 横スクロールが発生していない
  await page.goto(`${BASE}/office`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(overflow <= 1, `no horizontal overflow on mobile (overflow=${overflow}px)`);
  ok("mobile layout has no horizontal overflow");

  const relevantErrors = consoleErrors.filter((e) => !/fonts\.g|Failed to load resource|ERR_|net::/.test(e));
  if (relevantErrors.length) console.warn("console errors:\n" + relevantErrors.join("\n"));
  console.log("\nE2E PASSED");
} catch (e) {
  await shot("failure").catch(() => {});
  console.error(e);
  console.error("console errors:", consoleErrors.join("\n"));
  process.exitCode = 1;
} finally {
  await browser.close();
}
