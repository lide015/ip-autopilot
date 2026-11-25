// 冒煙測試：用真的瀏覽器把「下載即用版」從頭到尾操作一遍。
// 本機執行：npm test（需要 Chrome；可用 CHROME_PATH 指定路徑）
// GitHub Actions：先 npx playwright install --with-deps chromium
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL0 = pathToFileURL(join(root, 'index.html')).href;
const out = join(tmpdir(), 'ip-autopilot-test');
mkdirSync(out, { recursive: true });

// 測試影片：有 ffmpeg 就做一支 2 秒真影片，沒有就用假資料（只測存取，不測播放）
const video = join(out, 'test.mp4');
let realVideo = true;
try {
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=size=360x640:rate=24', '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', video]);
} catch {
  realVideo = false;
  writeFileSync(video, Buffer.alloc(4096, 1));
}

let failed = 0;
const ok = (cond, name) => { console.log(`${cond ? '✓' : '✗'} ${name}`); if (!cond) failed++; };

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const go = async (hash) => { await page.goto(URL0 + hash); await page.waitForTimeout(500); };

await go('');
ok((await page.textContent('h1')).includes('今天的進度'), '首頁打得開');
ok(await page.isVisible('.onboard'), '新手引導出現');

// 設定
await go('#settings');
await page.fill('#s-brand', '測試工作室');
await page.fill('#s-intro', '陪你學唱歌');
await page.fill('#s-base', 'http://not-https');
await page.click('#setf button.btn');
ok(await page.isVisible('#s-base-err'), '服務網址格式錯誤會在欄位旁提示');
await page.fill('#s-base', '');
ok(!(await page.isVisible('#s-base-err')), '改了欄位，錯誤提示就消失');
await page.click('#setf button.btn');
await page.waitForTimeout(400);
ok((await page.textContent('.brand b')) === '測試工作室', '品牌名稱存檔後側欄跟著變');

// 上傳：先測必填
await go('#upload');
await page.click('#upf button.btn');
ok(await page.isVisible('#u-title-err') && await page.isVisible('#u-link-err'), '沒填標題、沒選影片會在欄位旁提示');
await page.fill('#u-title', '測試短片');
await page.setInputFiles('#u-file', video);
await page.waitForTimeout(300);
ok((await page.textContent('#drop')).includes('test.mp4'), '選了影片會顯示檔名');
await page.fill('#u-title', '測試短片');
await page.click('#upf button.btn');
await page.waitForTimeout(1200);
ok((await page.evaluate(() => location.hash)) === '#content', '上傳後跳到內容看板');
ok((await page.locator('.card').count()) === 1, '看板出現一張卡');
if (realVideo) {
  const dur = await page.evaluate(() => new Promise((r) => { const v = document.querySelector('.card video'); if (!v) return r(-1); if (v.readyState > 0) return r(v.duration); v.onloadedmetadata = () => r(v.duration); setTimeout(() => r(-2), 4000); }));
  ok(dur > 1, `影片播得出來（${dur} 秒）`);
}

// AI 音樂剪輯：沒設定引擎時引導去設定；設定後連到預填好的 GitHub 表單
ok((await page.textContent('.card')).includes('先到設定填「AI 剪輯引擎」'), '沒設定剪輯引擎時會引導去設定');
await go('#settings');
await page.fill('#s-engine', '不合法');
await page.click('#setf button.btn');
ok(await page.isVisible('#s-engine-err'), '剪輯引擎格式錯誤會在欄位旁提示');
await page.fill('#s-engine', 'my-account/ip-autopilot');
await page.click('#setf button.btn');
await page.waitForTimeout(400);
await go('#content');
const editHref = await page.getAttribute('.card a[href*="issues/new"]', 'href');
ok(!!editHref && editHref.startsWith('https://github.com/my-account/ip-autopilot/issues/new?template=edit.yml') && editHref.includes('song='), '影片卡可以一鍵交給 AI 音樂剪輯（預填歌名）');

// 狀態、搜尋
await page.selectOption('select.status', '待審核');
await page.waitForTimeout(400);
await page.reload(); await page.waitForTimeout(800);
ok((await page.$eval('select.status', (e) => e.value)) === '待審核', '狀態改完重新整理還在');
await page.fill('#q', '不存在的字');
ok(await page.isVisible('#noq'), '搜尋不到時顯示提示');
await page.fill('#q', '測試');
ok(await page.isVisible('.card'), '搜尋得到時卡片出現');

// AI 文案：沒有金鑰時提供替代方案
await go('#studio');
ok(await page.isVisible('[data-act=prompt]'), '沒有金鑰也能用「複製提示詞」');

// 活動
await go('#events');
await page.click('[data-act=newev]');
await page.waitForTimeout(600);
ok((await page.locator('.ev').count()) === 1, '手動新增活動');
await page.locator('.ev .sop input').nth(1).check();
await page.waitForTimeout(500);
ok((await page.textContent('.ev')).includes('進度 2/6'), '勾選六步檢查會更新進度');

// 備份與匯入
await go('#settings');
const dl = page.waitForEvent('download');
await page.click('[data-act=export]');
const file = await (await dl).path();
const backup = readFileSync(file, 'utf8');
ok(JSON.parse(backup).items.length === 2, '備份檔包含內容與活動');
const ctx2 = await browser.newContext({ viewport: { width: 375, height: 812 } });
const p2 = await ctx2.newPage();
p2.on('pageerror', (e) => errors.push(String(e)));
await p2.goto(URL0 + '#settings'); await p2.waitForTimeout(600);
await p2.setInputFiles('#imp', file); await p2.waitForTimeout(900);
ok((await p2.textContent('.brand b')) === '測試工作室', '另一個瀏覽器匯入備份後資料都在');
await p2.goto(URL0 + '#content'); await p2.waitForTimeout(700);
ok((await p2.evaluate(() => document.documentElement.scrollWidth)) <= 375, '手機 375 寬沒有左右捲動');
const small = await p2.$$eval('.main button, .main a.btn, .main select, .main input:not([type=checkbox]):not([type=radio]):not(.sr)', (els) => els.filter((e) => e.offsetParent && e.getBoundingClientRect().height < 40).length);
ok(small === 0, '手機上的按鈕與欄位高度都夠大');

// 刪除要確認、且說清楚刪什麼
await go('#content');
await page.click('[data-act=del]');
const dlgText = await page.textContent('dialog.dlg');
ok(dlgText.includes('測試短片') && dlgText.includes('刪除影片卡'), '刪除前跳出確認，寫明要刪哪一支');
await page.click('dialog.dlg [value=no]');
ok((await page.locator('.card').count()) === 1, '按取消不會刪');
await page.click('[data-act=del]');
await page.click('dialog.dlg [value=yes]');
await page.waitForTimeout(500);
ok((await page.locator('.card').count()) === 0, '確認後才刪除');

ok(errors.length === 0, `沒有程式錯誤${errors.length ? '：' + errors.join(' | ') : ''}`);
await browser.close();
console.log(failed ? `\n${failed} 項失敗` : '\n全部通過');
process.exit(failed ? 1 : 0);
