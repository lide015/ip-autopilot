// 把共用畫面（app.js、app.css）複製到雲端版 cloud/public/。
// 用法：node scripts/sync-cloud.mjs          同步
//       node scripts/sync-cloud.mjs --check  只檢查，不一致時結束碼為 1（給 CI 用）
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// 個案配置由同一份資料產生兩版腳本，雙擊本機檔案也能套用，不依賴網路讀檔。
const catalog = JSON.parse(readFileSync(join(root, 'campaigns', 'catalog.json'), 'utf8'));
const campaigns = catalog.map(({ id, name }) => {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error('運營包代號格式不對');
  const data = JSON.parse(readFileSync(join(root, 'campaigns', id, 'profile.json'), 'utf8'));
  if (data.app !== 'ip-autopilot' || !Array.isArray(data.items) || !data.settings || 'aiKey' in data.settings) throw new Error('運營包格式不對或含有金鑰欄位');
  return { id, name, data };
});
const bundled = '// 由 scripts/sync-cloud.mjs 產生，請修改 campaigns/ 的來源資料。\nwindow.Campaigns = ' + JSON.stringify(campaigns, null, 2) + ';\n';
const files = ['app.js', 'app.css', 'campaigns.js'];
const check = process.argv.includes('--check');
let drift = 0;
for (const f of files) {
  const src = f === 'campaigns.js' ? bundled : readFileSync(join(root, f), 'utf8');
  if (f === 'campaigns.js') {
    let local = '';
    try { local = readFileSync(join(root, f), 'utf8'); } catch { /* 第一次產生 */ }
    if (local !== src) {
      drift++;
      if (check) console.error('✗ campaigns.js 與來源不同，請執行 node scripts/sync-cloud.mjs');
      else writeFileSync(join(root, f), src);
    }
  }
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
