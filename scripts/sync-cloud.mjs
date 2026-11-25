// 把共用畫面（app.js、app.css）複製到雲端版 cloud/public/。
// 用法：node scripts/sync-cloud.mjs          同步
//       node scripts/sync-cloud.mjs --check  只檢查，不一致時結束碼為 1（給 CI 用）
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['app.js', 'app.css'];
const check = process.argv.includes('--check');
let drift = 0;
for (const f of files) {
  const src = readFileSync(join(root, f), 'utf8');
  const dst = join(root, 'cloud', 'public', f);
  let cur = '';
  try { cur = readFileSync(dst, 'utf8'); } catch { /* 第一次同步 */ }
  if (cur === src) continue;
  drift++;
  if (check) console.error(`✗ cloud/public/${f} 跟根目錄的 ${f} 不一致，請執行 node scripts/sync-cloud.mjs`);
  else { writeFileSync(dst, src); console.log(`✓ 已同步 cloud/public/${f}`); }
}
if (check && drift) process.exit(1);
if (!drift) console.log('✓ 兩個版本的畫面一致');
