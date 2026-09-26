// 開発用: 決済機能ができるまで、手動でユーザーのプランを切り替える。
//   npm run set-plan -- you@example.com pro
//   npm run set-plan -- you@example.com free
import path from 'node:path';
import { loadConfig } from '../src/config.js';
import { openDb } from '../src/db.js';
import { createRepos } from '../src/repo/index.js';
import { PLANS } from '../src/lib/plans.js';

const [email, plan] = process.argv.slice(2);
if (!email || !PLANS[plan]) {
  console.error(`使い方: npm run set-plan -- <email> <${Object.keys(PLANS).join('|')}>`);
  process.exit(1);
}
const config = loadConfig();
const repo = createRepos(openDb(path.join(config.dataDir, 'growth-note.db')));
const user = repo.users.findByEmail(email.toLowerCase());
if (!user) {
  console.error(`ユーザーが見つかりません: ${email}`);
  process.exit(1);
}
repo.billing.setPlan(user.id, { plan, provider: 'manual' });
console.log(`${email} のプランを ${PLANS[plan].label} に変更しました`);
