/*
 * 個人IP運營中控台 — 畫面與操作（本機版與雲端版共用這一份）
 * 資料一律透過 window.Backend（store.js 或 cloud-adapter.js）存取。
 * 修改這個檔案後，執行 `node scripts/sync-cloud.mjs` 把它同步到 cloud/public/。
 */
{
// ===== 常數 =====
const B = window.Backend;
const ST = ['待剪輯', '剪輯中', '待審核', '已排程', '已發布'];
const ST_CLASS = { 待剪輯: 's-wait', 剪輯中: 's-wait', 待審核: 's-act', 已排程: 's-plan', 已發布: 's-done' };
const CAT = ['教學', '表演', '活動', '幕後', '生活', '其他'];
const ALL_PL = ['TikTok', 'YouTube', 'Facebook', 'Instagram', 'LINE', 'Threads'];
const EST = ['詢問中', '已確認', '已結案'];
const SOP = ['接到詢問', '報價確認', '前一週定流程', '前一天提醒', '活動當天', '結案感謝'];
const PUB = {
  TikTok: 'https://www.tiktok.com/tiktokstudio/upload',
  YouTube: 'https://studio.youtube.com',
  Facebook: 'https://business.facebook.com/latest/composer',
  Instagram: 'https://business.facebook.com/latest/composer',
  Threads: 'https://www.threads.net',
};
const TASKS = [
  ['all', '一支影片發全部平台', '影片內容或拍到的畫面'],
  ['short', '短影音標題與說明', '影片畫面重點'],
  ['post', '社群貼文', '想分享的事'],
  ['notice', '群組通知', '時間、地點、要帶什麼'],
  ['sales', '招生或銷售文案', '課程或商品、時間、報名方式'],
  ['reply', '難回訊息的高情商回覆', '貼上對方的訊息，再說你想怎麼處理（例如：想婉拒、想守住價格）'],
  ['script', '主持或直播串場稿', '活動類型、流程'],
  ['week', '本週內容包', '這週發生的事、想推的主題'],
];
const TPL = [
  ['開課／招生', '【開班通知】【課程名稱】開始報名囉！\n【地點】【星期幾、幾點到幾點】\n這期會學到：【三個重點】\n不用有經驗，只要願意開始就夠了！\n報名方式：【方式】\n—— {brand}'],
  ['活動花絮', '感謝【主辦單位】的邀請！今天在【地點】的【活動名稱】，\n【一個現場最感動或最好笑的畫面】。\n謝謝每一位到場的朋友，我們下次見！\n活動合作歡迎私訊洽詢。'],
  ['成果分享', '【學員或客戶稱呼】剛開始的時候【原本的狀況】，\n經過【多久】，今天【做到了什麼】！\n每一步都算數，為你驕傲 👏'],
  ['預告', '【日期】【時間】我會在【地點或平台】！\n當天有【內容】，還有【小驚喜】。\n想來的朋友記得留時間給我喔！'],
  ['節日問候', '【節日】快樂！\n謝謝一路支持的大家，祝你們身體健康、天天開心。\n—— {brand}'],
  ['活動確認訊息', '【稱呼】您好，我是 {brand}！很開心這次有機會合作 😊\n幫您整理一下我們說好的內容，麻煩您幫我看一下：\n📅 日期：【】\n⏰ 我報到：【】；活動時間：【】\n📍 地點：【】\n🎤 我負責：【】\n📞 現場聯絡人：【】\n另外想跟您確認：【還沒確定的事】\n如果有哪裡不對，隨時跟我說喔！'],
  ['活動前一天提醒', '【稱呼】晚安！明天【活動名稱】我會在【時間】到【地點】準備。\n現場聯絡人一樣是【姓名】嗎？明天見，預祝一切順利！'],
  ['活動後感謝', '【稱呼】謝謝您！昨天的【活動名稱】很順利，【一個具體畫面】我到現在都記得。\n有拍到幾段很棒的畫面，請問方便讓我在社群分享嗎？\n下次有需要也請記得找我們喔 🙏'],
  ['婉拒撞期', '【稱呼】您好！非常謝謝您想到我們 🙏\n很可惜【日期】當天已經有排定的活動，沒辦法親自到場，真的很不好意思。\n如果日期還能調整，或下次有活動，都很歡迎再找我們！'],
];
const IC = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  content: '<rect x="3" y="4" width="7" height="16" rx="2"/><rect x="14" y="4" width="7" height="10" rx="2"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  studio: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  events: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  templates: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
};
const VIEWS = [['home', '首頁'], ['content', '內容看板'], ['upload', '上傳影片'], ['studio', 'AI 文案'], ['events', '活動檔期'], ['templates', '範本庫'], ['settings', '設定']];

// ===== 工具 =====
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;
const opts = (arr, v) => arr.map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('');
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const wk = (d) => { try { return '週' + '日一二三四五六'[new Date(d + 'T12:00:00').getDay()]; } catch (e) { return ''; } };
const md = (d) => (d ? Number(d.slice(5, 7)) + '/' + Number(d.slice(8, 10)) : '未定');
const ago = (ts) => { if (!ts) return ''; const m = Math.round((Date.now() - ts) / 6e4); return m < 1 ? '剛剛' : m < 60 ? m + ' 分鐘前' : m < 1440 ? Math.round(m / 60) + ' 小時前' : Math.round(m / 1440) + ' 天前'; };
const mb = (n) => (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + ' MB';
const by = (a, f, dir = 1) => [...a].sort((x, y) => ((x[f] ?? '') > (y[f] ?? '') ? 1 : (x[f] ?? '') < (y[f] ?? '') ? -1 : 0) * dir);
const safeUrl = (u) => (/^https:\/\//.test(u || '') ? u : '');
const toast = (t) => { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 3600); };

async function api(path, opt = {}) {
  try { return await B.call(path, opt); }
  catch (e) { if (e.status === 401 && !opt.quiet) { S.authed = false; draw(); } throw e; }
}

// 確認對話框：刪除等無法復原的動作一律要說清楚刪什麼
function confirmBox({ title, body, ok }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'dlg';
    d.setAttribute('aria-labelledby', 'dlg-t');
    d.innerHTML = `<h2 id="dlg-t"></h2><p></p><div class="row end"><button class="btn ghost" value="no">取消</button><button class="btn danger" value="yes"></button></div>`;
    d.querySelector('h2').textContent = title;
    d.querySelector('p').textContent = body;
    d.querySelector('.danger').textContent = ok;
    const done = (v) => { d.close(); d.remove(); resolve(v); };
    d.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) done(b.value === 'yes'); else if (e.target === d) done(false); });
    d.addEventListener('cancel', (e) => { e.preventDefault(); done(false); });
    document.body.appendChild(d);
    d.showModal();
    d.querySelector('[value=no]').focus();
  });
}
// 欄位旁的錯誤訊息：送出時檢查，使用者一改就消失
function fieldError(el, msg) {
  clearError(el);
  const p = document.createElement('p');
  p.className = 'err'; p.id = el.id + '-err'; p.textContent = msg;
  el.setAttribute('aria-invalid', 'true');
  el.setAttribute('aria-describedby', p.id);
  (el.closest('label') || el).after(p);
  return false;
}
function clearError(el) { el.removeAttribute('aria-invalid'); const p = document.getElementById(el.id + '-err'); if (p) p.remove(); }

// ===== 狀態 =====
const S = {
  boot: false, authed: !B.features.login, setup: true, settings: null, items: [], view: 'home', filter: '全部', q: '',
  studio: { task: 'all', input: '', out: [], busy: false, cid: '' },
  ev: { text: '', busy: false, msg: '' }, up: { busy: false, pct: 0, file: null, preview: '' },
};
const content = () => S.items.filter((i) => i.kind === 'content');
const events = () => S.items.filter((i) => i.kind === 'event');
const plats = () => (S.settings?.platforms?.length ? S.settings.platforms : ALL_PL.slice(0, 5));
async function load() { const r = await api('/api/items'); S.items = r.items || []; }
async function loadSettings() { S.settings = await api('/api/settings'); applyBrand(); }
function applyBrand() {
  const s = S.settings || {};
  if (/^#[0-9a-fA-F]{6}$/.test(s.accent || '')) document.documentElement.style.setProperty('--brand', s.accent);
  document.title = (s.brand || '個人IP') + '｜運營中控台';
}
async function patch(id, data, { redraw = false, note = '' } = {}) {
  const it = S.items.find((x) => x.id === id);
  if (it) Object.assign(it, data, { updatedAt: Date.now() });
  try { await api('/api/items/' + id, { method: 'PATCH', body: data }); if (note) toast(note); }
  catch (e) { toast(e.message); }
  if (redraw) draw();
}

// ===== 畫面：登入（只有雲端版） =====
function vGate() {
  const first = !S.setup;
  return `<main class="gate"><form class="panel form" id="gate" novalidate><h1>${first ? '歡迎使用' : '登入'}</h1>
  <p class="sub">${first ? '先設定一組登入密碼，之後只有你能進來。' : '輸入你的密碼。'}</p>
  <label class="f">密碼<input type="password" id="pw" autocomplete="${first ? 'new-password' : 'current-password'}"></label>
  ${first ? '<label class="f">再輸入一次<input type="password" id="pw2" autocomplete="new-password"></label>' : ''}
  <button class="btn">${first ? '設定密碼並開始' : '登入'}</button></form></main>`;
}

// ===== 畫面：主框架 =====
function shell(inner) {
  const s = S.settings || {};
  const n = { content: content().filter((c) => c.status === '待審核').length, events: events().filter((e) => e.status !== '已結案' && (e.date || '') >= today()).length };
  const foot = B.features.login
    ? '<button class="btn sm ghost on-side" data-act="logout">登出</button>'
    : '<p>資料存在這個瀏覽器裡。<a href="#settings">記得定期備份</a></p>';
  return `<a class="skip" href="#main">跳到主要內容</a><div class="app"><aside class="side"><div class="brand"><div class="logo" aria-hidden="true"><svg viewBox="0 0 40 40" width="28" height="28"><rect x="15" y="5" width="10" height="18" rx="5" fill="var(--red)"/><path d="M11 18a9 9 0 0 0 18 0" fill="none" stroke="var(--red)" stroke-width="3" stroke-linecap="round"/><path d="M20 27v7M14 34h12" stroke="var(--red)" stroke-width="3" stroke-linecap="round"/></svg></div><div><b>${esc(s.brand || '我的品牌')}</b><small>運營中控台</small></div></div>
  <nav class="nav" aria-label="主選單">${VIEWS.map(([k, t]) => `<a href="#${k}" class="${S.view === k ? 'on' : ''}" ${S.view === k ? 'aria-current="page"' : ''}>${svg(k)}<span>${t}</span>${n[k] ? `<span class="badge" aria-label="${n[k]} 件待處理">${n[k]}</span>` : ''}</a>`).join('')}</nav>
  <div class="me">${foot}</div></aside>
  <main class="main" id="main" tabindex="-1">${inner}<p class="foot">AI 只寫稿，發出去之前一定要有人看過。</p></main></div>`;
}
const stTag = (s) => `<span class="tag ${ST_CLASS[s] || (s === '已結案' ? 's-done' : s === '已確認' ? 's-plan' : 's-wait')}">${esc(s)}</span>`;

function vHome() {
  const c = content(), cnt = (s) => c.filter((x) => x.status === s);
  const up = by(events().filter((e) => e.status !== '已結案' && (e.date || '') >= today()), 'date');
  const max = Math.max(1, ...ST.map((s) => cnt(s).length));
  const s = S.settings || {};
  const steps = [[!!s.intro || (s.brand && s.brand !== '我的品牌'), '填好品牌資料', '#settings'], [!!s.hasKey, '設定 AI 金鑰（可略過，改用複製提示詞）', '#settings'], [c.length > 0, '上傳第一支影片', '#upload'], [events().length > 0, '貼一段活動對話給 AI 整理', '#events']];
  const left = steps.filter((x) => !x[0]).length;
  const recent = by(S.items, 'updatedAt', -1).slice(0, 6);
  return `<div class="top"><div><h1 tabindex="-1">今天的進度</h1><p class="sub">${today().replace(/-/g, ' / ')}（${wk(today())}）· ${cnt('待審核').length ? `有 <b>${cnt('待審核').length}</b> 支影片等你審核` : '沒有等你審核的影片'}</p></div><a class="btn" href="#upload">${svg('upload')}上傳影片</a></div>
  ${left ? `<section class="panel onboard" aria-label="開始使用"><h2>開始使用：還差 ${left} 件事</h2><ol class="check">${steps.map(([ok, t, h], i) => `<li class="${ok ? 'ok' : ''}"><b aria-hidden="true">${ok ? '✓' : i + 1}</b>${ok ? `<span>${t}（完成）</span>` : `<a href="${h}">${t}</a>`}</li>`).join('')}</ol></section>` : ''}
  <div class="kpis"><a class="kpi" href="#content" data-act="filter" data-v="待剪輯"><span>待剪輯</span><b>${cnt('待剪輯').length + cnt('剪輯中').length}</b><small>含剪輯中 ${cnt('剪輯中').length} 支</small></a><a class="kpi hot" href="#content" data-act="filter" data-v="待審核"><span>待審核</span><b>${cnt('待審核').length}</b><small>看過沒問題就改「已排程」</small></a><a class="kpi" href="#content" data-act="filter" data-v="已排程"><span>已排程</span><b>${cnt('已排程').length}</b><small>發布後改「已發布」</small></a><a class="kpi" href="#events"><span>下一場活動</span><b>${up[0] ? md(up[0].date) : '—'}</b><small>${up[0] ? esc(up[0].name) : '目前沒有排定'}</small></a></div>
  <section class="panel"><h2>內容流水線：每支影片從左走到右</h2>${c.length ? '' : '<div class="empty"><p>還沒有影片。上傳第一支後，它會從「待剪輯」一路走到「已發布」。</p><a class="btn" href="#upload">上傳第一支影片</a></div>'}<div class="pipe" ${c.length ? '' : 'hidden'}>${ST.map((st, i) => { const L = cnt(st); return `<a class="st ${st === '已發布' ? 'done' : ''} ${st === '待審核' && L.length ? 'now' : ''}" href="#content" data-act="filter" data-v="${st}" aria-label="${st} ${L.length} 支"><div class="bar" style="height:${Math.round(46 + (L.length / max) * 140)}px"><b>${L.length}</b></div><p>${i + 1}. ${st}</p><ul>${L.slice(0, 2).map((x) => `<li>${esc(x.title)}</li>`).join('')}</ul></a>`; }).join('')}</div></section>
  <div class="two"><section class="panel"><h2>最近動態</h2>${recent.length ? `<ul class="list">${recent.map((r) => `<li><span class="when">${ago(r.updatedAt)}</span><span><b>${esc(r.title || r.name)}</b> ${stTag(r.status)}</span></li>`).join('')}</ul>` : `<div class="empty"><p>還沒有任何動態。</p><a class="btn" href="#upload">上傳第一支影片</a></div>`}</section>
  <section class="panel"><h2>即將到來的活動</h2>${up.length ? `<ul class="list">${up.slice(0, 4).map((e) => `<li><span class="when">${md(e.date)} ${wk(e.date)}</span><span><b>${esc(e.name)}</b><br><span class="muted">${esc(e.time || '')} ${esc(e.place || '')}</span></span></li>`).join('')}</ul><p class="more"><a href="#events">看全部檔期</a></p>` : `<div class="empty"><p>沒有排定的活動。</p><a class="btn ghost" href="#events">新增或整理活動</a></div>`}</section></div>`;
}

function card(x) {
  const id = esc(x.id), key = x.edited || x.media, link = safeUrl(x.link);
  const media = key ? `<video controls preload="metadata" playsinline data-media="${esc(key)}" aria-label="${esc(x.title)} 影片"></video>` : link ? `<a href="${esc(link)}" target="_blank" rel="noopener">開啟雲端影片連結</a>` : '還沒有影片檔';
  const xp = x.plats || [];
  return `<article class="card" data-search="${esc((x.title || '') + ' ' + (x.note || '') + ' ' + (x.cat || ''))}"><div class="media ${key ? '' : 'none'}">${media}</div><div class="cbody">
  <div class="row"><label class="sr" for="st-${id}">狀態</label><select class="status ${ST_CLASS[x.status] || ''}" id="st-${id}" data-id="${id}" data-f="status" data-redraw="1">${opts(ST, x.status)}</select><span class="tag">${esc(x.cat || '未分類')}</span>${x.srt ? '<span class="tag s-done">有字幕檔</span>' : ''}</div>
  <h3>${esc(x.title)}</h3>${x.note ? `<p class="note"><b>剪輯指示</b> ${esc(x.note)}</p>` : ''}
  <label class="f">預計發布<input type="datetime-local" data-id="${id}" data-f="scheduleAt" data-note="發布時間已儲存" value="${esc(x.scheduleAt || '')}"></label>
  <fieldset class="bare"><legend>要發的平台</legend><div class="row" data-plats="${id}">${plats().map((p) => `<label class="chip"><input type="checkbox" value="${esc(p)}" ${xp.includes(p) ? 'checked' : ''}>${esc(p)}</label>`).join('')}</div></fieldset>
  <details><summary>文案${x.captions ? '<span class="tag s-done">已寫好</span>' : '<span class="tag">還沒寫</span>'}</summary><label class="sr" for="cap-${id}">文案</label><textarea id="cap-${id}" rows="7" data-id="${id}" data-f="captions" data-note="文案已儲存" placeholder="AI 寫好的文案會放這裡，也可以直接修改">${esc(x.captions || '')}</textarea><div class="row"><button class="btn sm ghost" data-act="copyta">複製文案</button></div></details>
  ${key ? `<details><summary>字幕檔（SRT）${x.srt ? '<span class="tag s-done">已產生</span>' : ''}</summary>${x.srt ? `<label class="sr" for="srt-${id}">字幕</label><textarea id="srt-${id}" rows="6" data-id="${id}" data-f="srt" data-note="字幕已儲存">${esc(x.srt)}</textarea><div class="row"><button class="btn sm ghost" data-act="copyta">複製字幕</button><button class="btn sm ghost" data-act="dlsrt" data-id="${id}">下載 .srt</button></div>` : `<p class="muted">用 AI 把影片的話轉成字幕檔，可匯入 CapCut 或上傳到 YouTube。</p><button class="btn sm ghost" data-act="srt" data-id="${id}">產生字幕</button>`}</details>` : ''}
  <details><summary>發布包</summary><ol class="steps-mini"><li>下載影片</li><li>複製文案</li><li>開平台上傳、設時間</li><li>回來把狀態改成「已排程」或「已發布」</li></ol><div class="pub">${key ? `<button class="btn sm ghost" data-act="dlvid" data-k="${esc(key)}" data-n="${esc(x.title)}">下載影片</button>` : ''}${(xp.length ? xp : plats()).filter((p) => PUB[p]).map((p) => `<a class="btn sm ghost" href="${PUB[p]}" target="_blank" rel="noopener">開啟 ${esc(p)}</a>`).join('')}</div></details>
  <div class="row split"><button class="btn sm" data-act="ai" data-id="${id}">${svg('studio')}AI 寫文案</button><button class="btn sm quiet" data-act="del" data-id="${id}">刪除</button></div>
  <p class="muted meta">更新於 ${ago(x.updatedAt)}</p></div></article>`;
}
function vContent() {
  const L = S.filter === '全部' ? content() : content().filter((c) => c.status === S.filter);
  return `<div class="top"><div><h1 tabindex="-1">內容看板</h1><p class="sub">每支影片一張卡：改狀態、寫文案、產生字幕、拿發布包。</p></div><a class="btn" href="#upload">${svg('upload')}新增影片</a></div>
  <div class="tools"><label class="search">${svg('search')}<span class="sr">搜尋影片</span><input type="search" id="q" placeholder="搜尋標題、剪輯指示" value="${esc(S.q)}"></label></div>
  <div class="chips" role="group" aria-label="依狀態篩選">${['全部', ...ST].map((s) => `<button class="chip ${S.filter === s ? 'on' : ''}" aria-pressed="${S.filter === s}" data-act="filter" data-v="${s}">${s} <b>${s === '全部' ? content().length : content().filter((c) => c.status === s).length}</b></button>`).join('')}</div>
  ${L.length ? `<div class="cards">${by(L, 'updatedAt', -1).map(card).join('')}</div><div class="empty" id="noq" hidden><p>找不到符合的影片。</p></div>` : `<div class="empty"><p>${content().length ? '這一欄目前沒有影片。' : '還沒有任何影片。'}</p><a class="btn" href="#upload">上傳影片</a></div>`}`;
}
function vUpload() {
  const u = S.up;
  return `<div class="top"><div><h1 tabindex="-1">上傳影片</h1><p class="sub">${esc(B.features.uploadNote)}；放在雲端硬碟的影片也可以只貼連結。送出後會出現在「內容看板 → 待剪輯」。</p></div></div>
  <form class="form panel" id="upf" novalidate>
  <label class="f">標題（給自己看的）<input type="text" id="u-title" placeholder="例：週三課堂 合唱片段"></label>
  <div class="g2"><label class="f">類別<select id="u-cat">${opts(CAT, '教學')}</select></label></div>
  <fieldset class="bare"><legend>想發哪些平台</legend><div class="row">${plats().map((p) => `<label class="chip"><input type="checkbox" name="u-pl" value="${esc(p)}" ${p !== 'LINE' ? 'checked' : ''}>${esc(p)}</label>`).join('')}</div></fieldset>
  <label class="drop" id="drop"><input type="file" id="u-file" accept="video/*" class="sr">${u.file ? `<span class="drop-file"><b>${esc(u.file.name)}</b><span class="muted">${mb(u.file.size)}</span></span>${u.preview ? `<video src="${esc(u.preview)}" muted playsinline preload="metadata"></video>` : ''}<span class="muted">點這裡換一支</span>` : `${svg('upload')}<b>點這裡選影片，或把影片拖進來</b><span class="muted">手機可以直接從相簿選</span>`}</label>
  <label class="f">或貼雲端連結<input type="url" id="u-link" placeholder="https://drive.google.com/..."></label>
  <label class="f">想怎麼剪（給剪輯的人看）<textarea id="u-note" rows="3" placeholder="例：只要 0 分 30 秒到 1 分 20 秒，轉直式，上面加標題"></textarea></label>
  ${u.busy ? `<div class="progress" role="progressbar" aria-label="上傳進度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${u.pct}"><i style="transform:scaleX(${u.pct / 100})"></i></div><p class="muted" aria-live="polite">${B.features.local ? '儲存中' : '上傳中 ' + u.pct + '%'}，請不要關掉頁面</p>` : ''}
  <div class="row"><button class="btn" ${u.busy ? 'disabled' : ''}>${u.busy ? '處理中…' : '放進待剪輯'}</button></div></form>`;
}
function vStudio() {
  const s = S.studio, t = TASKS.find((x) => x[0] === s.task) || TASKS[0], hasKey = S.settings?.hasKey;
  return `<div class="top"><div><h1 tabindex="-1">AI 文案工作室</h1><p class="sub">說一句發生了什麼，產出可以直接複製的文案。${hasKey ? '' : '還沒設定 AI 金鑰時，按「複製提示詞」貼到自己的 ChatGPT 或 Claude。'}</p></div></div>
  <div class="panel"><div class="chips" role="group" aria-label="要寫什麼">${TASKS.map(([k, n]) => `<button class="chip ${s.task === k ? 'on' : ''}" aria-pressed="${s.task === k}" data-act="task" data-v="${k}">${n}</button>`).join('')}</div>
  <label class="f">${esc(t[2])}<textarea id="st-in" rows="5">${esc(s.input)}</textarea></label>
  <div class="row bottom"><label class="f grow">要存到哪支影片（可不選）<select id="st-cid"><option value="">不存，只複製</option>${by(content(), 'updatedAt', -1).map((c) => `<option value="${esc(c.id)}" ${c.id === s.cid ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}</select></label>
  ${hasKey ? `<button class="btn" data-act="gen" ${s.busy ? 'disabled' : ''}>${s.busy ? '正在寫…' : '一鍵產生'}</button>` : '<a class="btn ghost" href="#settings">設定 AI 金鑰</a>'}<button class="btn ${hasKey ? 'ghost' : ''}" data-act="prompt">複製提示詞</button></div></div>
  <div class="out" aria-live="polite">${s.busy ? '<div class="outc skeleton" aria-label="AI 正在寫"><i></i><i></i><i></i></div>' : ''}${s.out.map((o, i) => `<div class="outc"><b>${esc(o.label)}</b><pre id="o${i}">${esc(o.text)}</pre><button class="btn sm ghost" data-act="copy" data-t="o${i}">複製</button></div>`).join('')}
  ${s.out.length ? `<div class="row"><button class="btn ghost" data-act="copyall">全部複製</button>${s.cid ? '<button class="btn" data-act="savecap">存進這支影片的文案欄</button>' : ''}</div>` : ''}</div>`;
}
function evCard(e) {
  const id = esc(e.id), f = (n, l, t = 'text') => `<label class="f">${l}<input type="${t}" data-id="${id}" data-f="${n}" data-note="已儲存" value="${esc(e[n] || '')}"></label>`;
  const steps = e.steps || [];
  const done = steps.filter(Boolean).length;
  return `<article class="ev"><div class="date"><b>${md(e.date)}</b><span>${e.date ? wk(e.date) : ''} ${esc(e.time || '')}</span></div><div class="evb">
  <div class="row"><label class="sr" for="es-${id}">活動狀態</label><select class="status" id="es-${id}" data-id="${id}" data-f="status" data-redraw="1">${opts(EST, e.status)}</select><span class="tag">${esc(e.type || '活動')}</span><span class="muted">進度 ${done}/6</span></div>
  <h3>${esc(e.name)}</h3><p class="muted meta">${esc(e.place || '地點未定')} · 負責：${esc(e.role || '未填')}</p>
  <fieldset class="bare"><legend class="sr">六步檢查</legend><div class="sop" data-steps="${id}">${SOP.map((s, i) => `<label><input type="checkbox" ${steps[i] ? 'checked' : ''}>${i + 1}. ${s}</label>`).join('')}</div></fieldset>
  <details><summary>流程、聯絡人與備忘</summary><div class="g2">${f('name', '活動名稱')}${f('date', '日期', 'date')}${f('time', '時間')}${f('place', '地點')}${f('contact', '聯絡人與電話')}${f('role', '負責項目')}</div><label class="f">流程與備忘<textarea rows="6" data-id="${id}" data-f="notes" data-note="備忘已儲存">${esc(e.notes || '')}</textarea></label></details>
  <details><summary>確認訊息${e.confirm ? '<span class="tag s-done">已寫好</span>' : ''}</summary><label class="sr" for="cf-${id}">確認訊息</label><textarea id="cf-${id}" rows="8" data-id="${id}" data-f="confirm" data-note="確認訊息已儲存">${esc(e.confirm || '')}</textarea><div class="row"><button class="btn sm ghost" data-act="copyta">複製確認訊息</button></div></details>
  <div class="row split"><span class="muted">更新於 ${ago(e.updatedAt)}</span><button class="btn sm quiet" data-act="del" data-id="${id}">刪除</button></div></div></article>`;
}
function vEvents() {
  const open = by(events().filter((e) => e.status !== '已結案'), 'date'), done = by(events().filter((e) => e.status === '已結案'), 'date', -1);
  const hasKey = S.settings?.hasKey;
  return `<div class="top"><div><h1 tabindex="-1">活動檔期</h1><p class="sub">每場活動走同樣六步。對話一亂，貼進來讓 AI 整理成檔期和確認訊息。</p></div><button class="btn ghost" data-act="newev">手動新增活動</button></div>
  <section class="panel" style="margin-bottom:18px"><h2>整理活動</h2><label class="f">把跟客戶或主辦的對話整段貼上<textarea id="ev-in" rows="5" placeholder="直接貼上對話紀錄，雜亂也沒關係">${esc(S.ev.text)}</textarea></label>
  <div class="row">${hasKey ? `<button class="btn" data-act="evai" ${S.ev.busy ? 'disabled' : ''}>${S.ev.busy ? '整理中…' : '整理成檔期'}</button>` : '<a class="btn ghost" href="#settings">設定 AI 金鑰</a>'}<button class="btn ${hasKey ? 'ghost' : ''}" data-act="evprompt">複製提示詞</button><span class="muted" aria-live="polite">${esc(S.ev.msg)}</span></div></section>
  <div class="evs">${open.length ? open.map(evCard).join('') : '<div class="empty"><p>目前沒有進行中的活動。</p></div>'}</div>
  ${done.length ? `<details class="past"><summary>已結案（${done.length}）</summary><div class="evs">${done.map(evCard).join('')}</div></details>` : ''}`;
}
function vTemplates() {
  const b = S.settings?.brand || '我的品牌';
  return `<div class="top"><div><h1 tabindex="-1">範本庫</h1><p class="sub">【】裡換成當天的內容就能發。要依情況改寫，用「AI 文案」。</p></div></div>
  <div class="tpl">${TPL.map(([t, x], i) => `<div class="outc"><b>${t}</b><pre id="t${i}">${esc(x.replaceAll('{brand}', b))}</pre><button class="btn sm ghost" data-act="copy" data-t="t${i}">複製</button></div>`).join('')}</div>`;
}
function vSettings() {
  const s = S.settings || {}, area = (k, l, ph, r = 2) => `<label class="f">${l}<textarea id="s-${k}" rows="${r}" placeholder="${esc(ph)}">${esc(s[k] || '')}</textarea></label>`;
  return `<div class="top"><div><h1 tabindex="-1">設定</h1><p class="sub">AI 會照這裡的品牌資料寫文案。</p></div></div>
  <form class="form" id="setf" novalidate>
  <fieldset><legend>品牌</legend><div class="g2"><label class="f">品牌名稱<input type="text" id="s-brand" value="${esc(s.brand || '')}"></label><label class="f">品牌顏色<input type="color" id="s-accent" value="${esc(s.accent || '#c8102e')}"></label></div>
  ${area('intro', '一句話介紹', '例：陪你唱出好心情的歌唱老師')}${area('fields', '業務範圍', '例：歌唱教學、婚宴主持、活動表演')}${area('audience', '主要受眾', '例：想學唱歌的大人、找主持人的新人與廠商')}${area('tone', '說話語氣', '例：熱情、親切、專業，不浮誇')}${area('avoid', '不要用的字或話題', '例：最便宜、保證', 1)}
  <fieldset class="bare"><legend>我有經營的平台</legend><div class="row">${ALL_PL.map((p) => `<label class="chip"><input type="checkbox" name="s-pl" value="${p}" ${plats().includes(p) ? 'checked' : ''}>${p}</label>`).join('')}</div></fieldset></fieldset>
  <fieldset><legend>AI</legend><p class="muted">${esc(B.features.keyNote)} 不填也能用「複製提示詞」。</p>
  <div class="row" role="radiogroup" aria-label="AI 服務"><label class="chip"><input type="radio" name="s-prov" value="anthropic" ${s.aiProvider !== 'openai' ? 'checked' : ''}>Claude（Anthropic）</label><label class="chip"><input type="radio" name="s-prov" value="openai" ${s.aiProvider === 'openai' ? 'checked' : ''}>OpenAI 相容服務</label></div>
  <div class="g2"><label class="f">模型名稱<input type="text" id="s-model" value="${esc(s.aiModel || '')}" placeholder="例：claude-sonnet-5-5"></label><label class="f">服務網址（可不填）<input type="url" id="s-base" value="${esc(s.aiBaseUrl || '')}" placeholder="例：https://.../v1"></label></div>
  <label class="f">API 金鑰<input type="password" id="s-key" autocomplete="off" placeholder="${s.hasKey ? '已設定（尾碼 ' + esc(s.keyTail) + '），要換才填' : '貼上你的 API 金鑰'}"></label>
  <div class="g2"><label class="f">字幕模型（OpenAI 相容才有）<input type="text" id="s-stt" value="${esc(s.sttModel || 'whisper-1')}"></label></div>
  ${s.hasKey ? '<label class="chip self"><input type="checkbox" id="s-clear">刪除已存的金鑰</label>' : ''}</fieldset>
  <div class="row"><button class="btn">儲存設定</button></div></form>
  ${B.features.login ? `<form class="form panel" id="pwf" novalidate><h2>更改密碼</h2><div class="g2"><label class="f">目前密碼<input type="password" id="p-cur" autocomplete="current-password"></label><label class="f">新密碼（至少 8 個字）<input type="password" id="p-new" autocomplete="new-password"></label></div><div class="row"><button class="btn ghost">更改密碼</button></div></form>` : ''}
  <section class="panel narrow"><h2>備份與搬家</h2><p class="muted">${B.features.local ? '資料只存在這個瀏覽器。清除瀏覽器資料、換電腦或換瀏覽器前，先下載備份檔；到新地方再匯入。' : '定期下載一份備份放在自己的雲端硬碟。'}備份含內容、活動與設定，不含金鑰與影片檔。</p><p class="muted" id="usage"></p><div class="row"><button class="btn ghost" data-act="export">下載備份檔</button><label class="btn ghost">匯入備份檔<input type="file" id="imp" accept="application/json,.json" class="sr"></label></div></section>`;
}
const R = { home: vHome, content: vContent, upload: vUpload, studio: vStudio, events: vEvents, templates: vTemplates, settings: vSettings };

// ===== 繪製 =====
function draw(focus = false) {
  const root = $('#root');
  if (!S.boot) { root.innerHTML = '<main class="gate" aria-busy="true"><p class="muted">載入中…</p></main>'; return; }
  if (!S.authed) { root.innerHTML = vGate(); $('#pw')?.focus(); return; }
  const y = window.scrollY;
  root.innerHTML = shell(R[S.view]());
  if (focus) { window.scrollTo(0, 0); $('#main h1')?.focus({ preventScroll: true }); } else window.scrollTo(0, y);
  const on = document.querySelector('.nav a.on');
  if (on && innerWidth < 900) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  hydrate();
  if (S.view === 'content' && S.q) applySearch();
}
async function hydrate() {
  for (const v of document.querySelectorAll('video[data-media]')) {
    const u = await B.mediaUrl(v.dataset.media).catch(() => null);
    if (!v.isConnected) continue;
    if (u) v.src = u;
    else { v.parentElement.classList.add('none'); v.replaceWith(Object.assign(document.createElement('span'), { textContent: '這台裝置上找不到影片檔（備份檔不含影片）' })); }
  }
  const el = document.getElementById('usage');
  if (el) { const x = await B.usage(); if (x && x.quota) el.textContent = `目前用了 ${mb(x.used)}，瀏覽器可用空間約 ${(x.quota / 1073741824).toFixed(1)} GB。`; }
}
function applySearch() {
  const q = S.q.trim().toLowerCase();
  let shown = 0;
  for (const c of document.querySelectorAll('.card')) { const hit = !q || c.dataset.search.toLowerCase().includes(q); c.hidden = !hit; if (hit) shown++; }
  const n = document.getElementById('noq'); if (n) n.hidden = shown > 0;
}
function route() { const h = location.hash.slice(1); S.view = R[h] ? h : 'home'; draw(true); }
window.addEventListener('hashchange', route);

// ===== 動作 =====
async function copy(text) { try { await navigator.clipboard.writeText(text); toast('已複製'); } catch (e) { toast('無法自動複製，請長按文字自行複製'); } }
function download(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
function pickFile(file) {
  if (!file) return;
  if (!/^video\//.test(file.type)) { toast('只能選影片檔'); return; }
  if (S.up.preview && B.features.local === false) URL.revokeObjectURL(S.up.preview);
  S.up.file = file; S.up.preview = URL.createObjectURL(file);
  const keep = { title: $('#u-title').value, link: $('#u-link').value, note: $('#u-note').value };
  draw();
  $('#u-title').value = keep.title; $('#u-link').value = keep.link; $('#u-note').value = keep.note;
}

document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  if (f.id === 'gate') {
    const pw = $('#pw'), pw2 = $('#pw2');
    if (pw.value.length < 8) return fieldError(pw, '密碼至少要 8 個字');
    if (pw2 && pw.value !== pw2.value) return fieldError(pw2, '兩次輸入的密碼不一樣');
    try { await api(S.setup ? '/api/login' : '/api/setup', { method: 'POST', body: { password: pw.value }, quiet: true }); S.setup = true; S.authed = true; await Promise.all([load(), loadSettings()]); route(); }
    catch (err) { fieldError(pw, err.message); }
  }
  if (f.id === 'upf') upload();
  if (f.id === 'setf') saveSettings();
  if (f.id === 'pwf') {
    const cur = $('#p-cur'), nx = $('#p-new');
    if (nx.value.length < 8) return fieldError(nx, '新密碼至少要 8 個字');
    try { await api('/api/password', { method: 'POST', body: { current: cur.value, next: nx.value } }); toast('密碼已更新，其他裝置需要重新登入'); f.reset(); }
    catch (err) { fieldError(cur, err.message); }
  }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.f && t.dataset.id) return patch(t.dataset.id, { [t.dataset.f]: t.value }, { redraw: !!t.dataset.redraw, note: t.dataset.note || (t.dataset.f === 'status' ? `已改成「${t.value}」` : '') });
  const pl = t.closest('[data-plats]');
  if (pl) return patch(pl.dataset.plats, { plats: [...pl.querySelectorAll('input:checked')].map((i) => i.value) });
  const sp = t.closest('[data-steps]');
  if (sp) return patch(sp.dataset.steps, { steps: [...sp.querySelectorAll('input')].map((i) => i.checked) }, { redraw: true });
  if (t.id === 'st-cid') S.studio.cid = t.value;
  if (t.id === 'u-file') pickFile(t.files[0]);
  if (t.id === 'imp' && t.files[0]) {
    t.files[0].text().then((txt) => B.importData(JSON.parse(txt))).then(async (n) => { await Promise.all([load(), loadSettings()]); draw(); toast(`已匯入 ${n} 筆資料`); }).catch((err) => toast(err instanceof SyntaxError ? '檔案格式不對，請選本系統下載的備份檔' : err.message || '匯入失敗'));
  }
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.getAttribute('aria-invalid')) clearError(t);
  if (t.id === 'st-in') S.studio.input = t.value;
  if (t.id === 'ev-in') S.ev.text = t.value;
  if (t.id === 'q') { S.q = t.value; applySearch(); }
});
document.addEventListener('dragover', (e) => { const d = e.target.closest?.('#drop'); if (d) { e.preventDefault(); d.classList.add('over'); } });
document.addEventListener('dragleave', (e) => { const d = e.target.closest?.('#drop'); if (d) d.classList.remove('over'); });
document.addEventListener('drop', (e) => { const d = e.target.closest?.('#drop'); if (d) { e.preventDefault(); d.classList.remove('over'); pickFile(e.dataTransfer.files[0]); } });
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'filter') { S.filter = b.dataset.v; if (location.hash !== '#content') return; e.preventDefault(); draw(); return; }
  e.preventDefault();
  if (a === 'logout') { await api('/api/logout', { method: 'POST', quiet: true }).catch(() => {}); S.authed = false; draw(); return; }
  if (a === 'copy') return copy($('#' + b.dataset.t).textContent);
  if (a === 'copyta') return copy(b.closest('details').querySelector('textarea').value);
  if (a === 'copyall') return copy(S.studio.out.map((o) => '【' + o.label + '】\n' + o.text).join('\n\n'));
  if (a === 'task') { S.studio.task = b.dataset.v; return draw(); }
  if (a === 'ai') { const c = S.items.find((x) => x.id === b.dataset.id); S.studio = { task: 'all', input: c ? c.title + (c.note ? '。' + c.note : '') : '', out: [], busy: false, cid: b.dataset.id }; location.hash = '#studio'; return; }
  if (a === 'del') {
    const it = S.items.find((x) => x.id === b.dataset.id); if (!it) return;
    const name = it.title || it.name || '這筆資料';
    const ok = await confirmBox({ title: `刪除「${name}」？`, body: it.kind === 'content' && (it.media || it.edited) ? '卡片和裡面的影片檔都會一起刪除，無法復原。' : '刪除後無法復原。', ok: it.kind === 'content' ? '刪除影片卡' : '刪除活動' });
    if (!ok) return;
    try { await api('/api/items/' + it.id, { method: 'DELETE' }); S.items = S.items.filter((x) => x.id !== it.id); draw(); toast(`已刪除「${name}」`); } catch (err) { toast(err.message); }
    return;
  }
  if (a === 'gen') return gen();
  if (a === 'prompt') { try { const r = await api('/api/prompt', { method: 'POST', body: { task: S.studio.task, input: S.studio.input, platforms: plats() } }); copy(r.prompt); } catch (err) { toast(err.message); } return; }
  if (a === 'evprompt') { try { const r = await api('/api/prompt', { method: 'POST', body: { task: 'event', input: S.ev.text } }); copy(r.prompt); } catch (err) { toast(err.message); } return; }
  if (a === 'savecap') { await patch(S.studio.cid, { captions: S.studio.out.map((o) => '【' + o.label + '】\n' + o.text).join('\n\n') }, { note: '已存進影片卡片' }); return; }
  if (a === 'evai') return evai();
  if (a === 'newev') { try { await api('/api/items', { method: 'POST', body: { kind: 'event', data: { name: '新活動（請改名）', type: '活動', date: today(), status: '詢問中', steps: [true] } } }); await load(); draw(); toast('已新增，展開「流程、聯絡人與備忘」填資料'); } catch (err) { toast(err.message); } return; }
  if (a === 'srt') { b.disabled = true; b.textContent = '產生中，影片越長越久…'; try { const r = await api('/api/transcribe', { method: 'POST', body: { id: b.dataset.id } }); const it = S.items.find((x) => x.id === b.dataset.id); if (it) it.srt = r.srt; draw(); toast('字幕已產生'); } catch (err) { toast(err.message); b.disabled = false; b.textContent = '產生字幕'; } return; }
  if (a === 'dlsrt') { const it = S.items.find((x) => x.id === b.dataset.id); if (it?.srt) download((it.title || 'subtitle') + '.srt', it.srt); return; }
  if (a === 'dlvid') { try { await B.downloadMedia(b.dataset.k, b.dataset.n); } catch (err) { toast(err.message); } return; }
  if (a === 'export') { try { const d = await B.exportData(); download(`備份-${today()}.json`, JSON.stringify(d, null, 2)); } catch (err) { toast(err.message); } return; }
});

async function upload() {
  const title = $('#u-title'), link = $('#u-link'), file = S.up.file;
  const ps = [...document.querySelectorAll('[name=u-pl]:checked')].map((i) => i.value), cat = $('#u-cat').value, note = $('#u-note').value.trim();
  let ok = true;
  if (!title.value.trim()) ok = fieldError(title, '請寫一個標題，方便之後找到這支影片');
  if (!file && !link.value.trim()) ok = fieldError(link, '請選一支影片，或貼上雲端連結');
  else if (link.value.trim() && !safeUrl(link.value.trim())) ok = fieldError(link, '連結要用 https:// 開頭');
  if (file && file.size > B.features.uploadMax) ok = fieldError(link, `影片超過 ${mb(B.features.uploadMax)}，請先壓縮，或改貼雲端連結`);
  if (!ok) { document.querySelector('[aria-invalid=true]')?.focus(); return; }
  const data = { title: title.value.trim(), cat, status: '待剪輯', media: '', link: link.value.trim(), note, plats: ps, scheduleAt: '', captions: '' };
  S.up.busy = true; S.up.pct = 0; draw();
  try {
    if (file) data.media = await B.putMedia(file, (p) => { S.up.pct = p; const bar = document.querySelector('.progress i'); if (bar) { bar.style.transform = `scaleX(${p / 100})`; bar.parentElement.setAttribute('aria-valuenow', p); } });
    await api('/api/items', { method: 'POST', body: { kind: 'content', data } });
    await load();
    S.up = { busy: false, pct: 0, file: null, preview: '' };
    S.filter = '待剪輯'; toast(`「${data.title}」已放進待剪輯`); location.hash = '#content';
  } catch (err) { S.up.busy = false; draw(); toast(err.message || '存檔失敗，請改貼雲端連結'); }
}
async function gen() {
  const s = S.studio;
  if (!s.input.trim()) { const el = $('#st-in'); fieldError(el, '請先寫一下內容'); el.focus(); return; }
  s.busy = true; s.out = []; draw();
  try { const r = await api('/api/ai', { method: 'POST', body: { task: s.task, input: s.input, platforms: (S.items.find((x) => x.id === s.cid)?.plats) || plats() } }); s.out = (Array.isArray(r.items) ? r.items : []).map((o) => ({ label: String(o.label || ''), text: String(o.text || '') })).filter((o) => o.text); if (!s.out.length) toast('AI 這次沒有給出內容，請再按一次'); }
  catch (err) { toast(err.message); }
  s.busy = false; draw();
}
async function evai() {
  const ev = S.ev;
  if (!ev.text.trim()) { const el = $('#ev-in'); fieldError(el, '請先貼上對話'); el.focus(); return; }
  ev.busy = true; ev.msg = ''; draw();
  try {
    const v = await api('/api/ai', { method: 'POST', body: { task: 'event', input: ev.text } });
    const L = (t, arr) => (Array.isArray(arr) && arr.length ? t + '\n' + arr.map((x) => '・' + x).join('\n') : '');
    const notes = [L('流程', v.flow), L('要準備', v.needs), L('待確認', v.open)].filter(Boolean).join('\n\n');
    await api('/api/items', { method: 'POST', body: { kind: 'event', data: { name: String(v.name || '未命名活動'), type: String(v.type || '活動'), date: /^\d{4}-\d{2}-\d{2}$/.test(v.date || '') ? v.date : '', time: String(v.time || ''), place: String(v.place || ''), contact: String(v.contact || ''), role: String(v.role || ''), status: '已確認', steps: [true, true], notes, confirm: String(v.confirm || '') } } });
    await load(); ev.text = ''; ev.msg = '已整理成檔期，展開「確認訊息」就能複製。';
  } catch (err) { ev.msg = err.message; }
  ev.busy = false; draw();
}
async function saveSettings() {
  const v = (id) => $('#' + id).value;
  const base = $('#s-base');
  if (base.value.trim() && !safeUrl(base.value.trim())) { fieldError(base, '服務網址要用 https:// 開頭'); base.focus(); return; }
  const body = { brand: v('s-brand').trim() || '我的品牌', accent: v('s-accent'), intro: v('s-intro'), fields: v('s-fields'), audience: v('s-audience'), tone: v('s-tone'), avoid: v('s-avoid'), platforms: [...document.querySelectorAll('[name=s-pl]:checked')].map((i) => i.value), aiProvider: document.querySelector('[name=s-prov]:checked').value, aiModel: v('s-model').trim(), aiBaseUrl: base.value.trim(), sttModel: v('s-stt').trim() };
  const key = v('s-key').trim();
  if (key) body.aiKey = key;
  if ($('#s-clear')?.checked) body.aiKey = '';
  try { await api('/api/settings', { method: 'PUT', body }); await loadSettings(); draw(); toast('設定已儲存'); } catch (err) { toast(err.message); }
}

// ===== 啟動 =====
(async () => {
  draw();
  try {
    const st = await api('/api/state', { quiet: true });
    S.setup = st.setup; S.authed = st.authed;
    if (/^#[0-9a-fA-F]{6}$/.test(st.accent || '')) document.documentElement.style.setProperty('--brand', st.accent);
    if (S.authed) await Promise.all([load(), loadSettings()]);
  } catch (e) { toast('讀取資料失敗，請重新整理'); }
  S.boot = true; route();
})();
}
