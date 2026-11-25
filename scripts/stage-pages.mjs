// 只打包網站需要的公開檔案，不把開發環境、金鑰或測試狀態放上網站。
import { mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, '_site');
mkdirSync(target, { recursive: true });
for (const file of ['index.html', 'app.css', 'app.js', 'store.js', 'campaigns.js', '.nojekyll']) copyFileSync(join(root, file), join(target, file));
console.log('已準備網站公開檔案');
