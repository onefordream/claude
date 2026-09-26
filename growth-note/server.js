import { loadConfig } from './src/config.js';
import { createApp } from './src/app.js';

const config = loadConfig();
const app = createApp(config);
const addr = await app.start();

console.log(`Growth Note: http://localhost:${addr.port}`);
console.log(`  data dir : ${config.dataDir}`);
console.log(`  AI       : ${app.ai.enabled ? `Claude API (${app.ai.model})` : '簡易分析モード（ANTHROPIC_API_KEY 未設定）'}`);

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    console.log(`\n${sig} を受信。終了します…`);
    await app.close();
    process.exit(0);
  });
}
