{
// ===== 常數 =====
const ST = ['待剪輯', '剪輯中', '待審核', '已排程', '已發布'];
const CAT = ['教學', '表演', '活動', '幕後', '生活', '其他'];
const ALL_PL = ['TikTok', 'YouTube', 'Facebook', 'Instagram', 'LINE', 'Threads'];
const EST = ['詢問中', '已確認', '已結案'];
const SOP = ['接到詢問', '報價確認', '前一週定流程', '前一天提醒', '活動當天', '結案感謝'];
const UPLOAD_MAX = 1024 * 1024 * 1024;
const mediaUrls = new Map();
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
const by = (a, f, dir = 1) => [...a].sort((x, y) => ((x[f] ?? '') > (y[f] ?? '') ? 1 : (x[f] ?? '') < (y[f] ?? '') ? -1 : 0) * dir);
const safeUrl = (u) => (/^https:\/\//.test(u || '') ? u : '');
const toast = (t) => { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 3600); };

async function api(path, opt = {}) { return window.LocalAPI.call(path, opt); }

// ===== 狀態 =====
const S = {
  boot: false, setup: false, authed: false, settings: null, items: [], view: 'home', filter: '全部',
  studio: { task: 'all', input: '', out: [], busy: false, cid: '', prompt: '' },
  ev: { text: '', busy: false, msg: '' }, up: { busy: false, pct: 0 }, armed: null,
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
async function patch(id, data, redraw = false) {
  const it = S.items.find((x) => x.id === id);
  if (it) Object.assign(it, data, { updatedAt: Date.now() });
  try { await api('/api/items/' + id, { method: 'PATCH', body: data }); } catch (e) { toast(e.message); }
  if (redraw) draw();
}

// ===== 畫面：登入 =====
function vGate() {
  const first = !S.setup;
  return `<div class="gate"><form class="panel form" id="gate"><h1>${first ? '歡迎使用' : '登入'}</h1>
  <p class="sub" style="margin:0">${first ? '這是你專屬的個人IP運營中控台。先設定一組登入密碼，之後只有你能進來。' : '輸入你的密碼。'}</p>
  <label class="f">密碼<input type="password" id="pw" autocomplete="${first ? 'new-password' : 'current-password'}" minlength="8" required></label>
  ${first ? '<label class="f">再輸入一次<input type="password" id="pw2" autocomplete="new-password" minlength="8" required></label>' : ''}
  <button class="btn">${first ? '設定密碼並開始' : '登入'}</button><p class="muted" id="gmsg" style="margin:0"></p></form></div>`;
}

// ===== 畫面：主框架 =====
function shell(inner) {
  const s = S.settings || {};
  const n = { content: content().filter((c) => c.status === '待審核').length, events: events().filter((e) => e.status !== '已結案' && (e.date || '') >= today()).length };
  return `<div class="app"><aside class="side"><div class="brand"><div class="logo" aria-hidden="true"><svg viewBox="0 0 40 40" width="28" height="28"><rect x="15" y="5" width="10" height="18" rx="5" fill="var(--red)"/><path d="M11 18a9 9 0 0 0 18 0" fill="none" stroke="var(--red)" stroke-width="3" stroke-linecap="round"/><path d="M20 27v7M14 34h12" stroke="var(--red)" stroke-width="3" stroke-linecap="round"/></svg></div><div><b>${esc(s.brand || '我的品牌')}</b><small>運營中控台</small></div></div>
  <nav class="nav">${VIEWS.map(([k, t]) => `<a href="#${k}" class="${S.view === k ? 'on' : ''}">${svg(k)}<span>${t}</span>${n[k] ? `<span class="badge">${n[k]}</span>` : ''}</a>`).join('')}</nav>
  <div class="me"><span>資料存在這個瀏覽器裡<br><a href="#settings" style="color:#fff">記得定期備份</a></span></div></aside>
  <main class="main" id="main">${inner}<p class="foot">AI 只寫稿，發出去之前一定要有人看過。</p></main></div>`;
}

function vHome() {
  const c = content(), cnt = (s) => c.filter((x) => x.status === s);
  const up = by(events().filter((e) => e.status !== '已結案' && (e.date || '') >= today()), 'date');
  const max = Math.max(1, ...ST.map((s) => cnt(s).length));
  const s = S.settings || {};
  const steps = [[!!s.intro || (s.brand && s.brand !== '我的品牌'), '填好品牌資料', '#settings'], [!!s.hasKey, '設定 AI 金鑰（可略過，改用複製提示詞）', '#settings'], [c.length > 0, '上傳第一支影片', '#upload'], [events().length > 0, '貼一段活動對話給 AI 整理', '#events']];
  const setupDone = steps.every((x) => x[0]);
  const recent = by(S.items, 'updatedAt', -1).slice(0, 6);
  return `<div class="top"><div><h1>今天的舞台</h1><p class="sub">${today().replace(/-/g, ' / ')}（${wk(today())}）· 有 <b>${cnt('待審核').length}</b> 支影片待審核</p></div><a class="btn" href="#upload">${svg('upload')}上傳影片</a></div>
  ${setupDone ? '' : `<section class="panel" style="margin-bottom:18px"><h2>開始使用：四件事</h2><ul class="check">${steps.map(([ok, t, h], i) => `<li class="${ok ? 'ok' : ''}"><b>${ok ? '✓' : i + 1}</b><a href="${h}">${t}</a></li>`).join('')}</ul></section>`}
  <div class="kpis"><div class="kpi"><span>待剪輯</span><b>${cnt('待剪輯').length + cnt('剪輯中').length}</b><small>含剪輯中 ${cnt('剪輯中').length} 支</small></div><div class="kpi hot"><span>待審核</span><b>${cnt('待審核').length}</b><small>看過沒問題就改「已排程」</small></div><div class="kpi"><span>已排程</span><b>${cnt('已排程').length}</b><small>發布後改「已發布」</small></div><div class="kpi"><span>下一場活動</span><b>${up[0] ? md(up[0].date) : '—'}</b><small>${up[0] ? esc(up[0].name) : '目前沒有排定'}</small></div></div>
  <section class="panel"><h2>內容流水線：每支影片從左走到右</h2><div class="pipe">${ST.map((st, i) => { const L = cnt(st); return `<a class="st ${st === '已發布' ? 'done' : ''} ${st === '待審核' && L.length ? 'now' : ''}" href="#content" data-act="filter" data-v="${st}"><div class="bar" style="height:${Math.round(46 + (L.length / max) * 140)}px"><b>${L.length}</b></div><p>${i + 1}. ${st}</p><ul>${L.slice(0, 2).map((x) => `<li>${esc(x.title)}</li>`).join('')}</ul></a>`; }).join('')}</div></section>
  <div class="two"><section class="panel"><h2>最近動態</h2>${recent.length ? `<ul class="list">${recent.map((r) => `<li><span class="when">${ago(r.updatedAt)}</span><span><b>${esc(r.title || r.name)}</b> <span class="tag ${r.status === '已發布' || r.status === '已結案' ? 'g' : ''}">${esc(r.status)}</span></span></li>`).join('')}</ul>` : '<div class="empty">還沒有動態。先上傳第一支影片吧！</div>'}</section>
  <section class="panel"><h2>即將到來的活動</h2>${up.length ? `<ul class="list">${up.slice(0, 4).map((e) => `<li><span class="when">${md(e.date)} ${wk(e.date)}</span><span><b>${esc(e.name)}</b><br><span class="muted">${esc(e.time || '')} ${esc(e.place || '')}</span></span></li>`).join('')}</ul>` : '<div class="empty">沒有排定的活動。</div>'}<p style="margin:12px 0 0"><a href="#events">看全部檔期 →</a></p></section></div>`;
}

function card(x) {
  const id = esc(x.id), key = x.edited || x.media, link = safeUrl(x.link);
  const media = key ? `<video controls preload="metadata" playsinline data-media="${esc(key)}"></video>` : link ? `<a href="${esc(link)}" target="_blank" rel="noopener">開啟雲端影片連結</a>` : '還沒有影片檔';
  const xp = x.plats || [];
  return `<article class="card"><div class="media ${key ? '' : 'none'}">${media}</div><div class="cbody">
  <div class="row"><select class="status" aria-label="狀態" data-id="${id}" data-f="status" data-redraw="1">${opts(ST, x.status)}</select><span class="tag">${esc(x.cat || '未分類')}</span>${x.srt ? '<span class="tag g">有字幕檔</span>' : ''}</div>
  <h3>${esc(x.title)}</h3>${x.note ? `<p class="note">剪輯指示：${esc(x.note)}</p>` : ''}
  <label class="f">預計發布<input type="datetime-local" data-id="${id}" data-f="scheduleAt" value="${esc(x.scheduleAt || '')}"></label>
  <div class="row" data-plats="${id}">${plats().map((p) => `<label class="chip"><input type="checkbox" value="${esc(p)}" ${xp.includes(p) ? 'checked' : ''}>${esc(p)}</label>`).join('')}</div>
  <details><summary>文案${x.captions ? '（已寫好）' : '（還沒寫）'}</summary><textarea rows="7" data-id="${id}" data-f="captions" placeholder="AI 寫好的文案會放這裡，也可以直接修改">${esc(x.captions || '')}</textarea><div class="row" style="margin-top:8px"><button class="btn sm ghost" data-act="copyta">複製文案</button></div></details>
  ${key ? `<details><summary>字幕檔（SRT）${x.srt ? '' : '：還沒產生'}</summary>${x.srt ? `<textarea rows="6" data-id="${id}" data-f="srt">${esc(x.srt)}</textarea><div class="row" style="margin-top:8px"><button class="btn sm ghost" data-act="copyta">複製字幕</button><button class="btn sm ghost" data-act="dlsrt" data-id="${id}">下載 .srt</button></div>` : `<p class="muted">用 AI 把影片的話轉成字幕檔，可匯入 CapCut 或上傳到 YouTube。</p><button class="btn sm ghost" data-act="srt" data-id="${id}">產生字幕</button>`}</details>` : ''}
  <details><summary>發布包</summary><p class="muted" style="margin:4px 0 10px">1. 下載影片 2. 複製文案 3. 開平台上傳、設時間 4. 回來把狀態改成「已排程」或「已發布」。</p><div class="pub">${key ? `<button class="btn sm ghost" data-act="dlvid" data-k="${esc(key)}" data-n="${esc(x.title)}">下載影片</button>` : ''}${(xp.length ? xp : plats()).filter((p) => PUB[p]).map((p) => `<a class="btn sm ghost" href="${PUB[p]}" target="_blank" rel="noopener">開啟 ${esc(p)}</a>`).join('')}</div></details>
  <div class="row"><button class="btn sm" data-act="ai" data-id="${id}">${svg('studio')}AI 寫文案</button><button class="btn sm ghost" data-act="del" data-id="${id}">刪除</button></div>
  <p class="muted" style="margin:0">更新於 ${ago(x.updatedAt)}</p></div></article>`;
}
function vContent() {
  const L = S.filter === '全部' ? content() : content().filter((c) => c.status === S.filter);
  return `<div class="top"><div><h1>內容看板</h1><p class="sub">每支影片一張卡：改狀態、寫文案、產生字幕、拿發布包。</p></div><a class="btn" href="#upload">${svg('upload')}新增影片</a></div>
  <div class="chips">${['全部', ...ST].map((s) => `<button class="chip ${S.filter === s ? 'on' : ''}" data-act="filter" data-v="${s}">${s} <b>${s === '全部' ? content().length : content().filter((c) => c.status === s).length}</b></button>`).join('')}</div>
  ${L.length ? `<div class="cards">${by(L, 'updatedAt', -1).map(card).join('')}</div>` : '<div class="empty">這一欄目前沒有影片。</div>'}`;
}
function vUpload() {
  return `<div class="top"><div><h1>上傳影片</h1><p class="sub">影片會存在這個瀏覽器裡（1 GB 以內）；放在雲端硬碟的影片也可以只貼連結。送出後會出現在「內容看板 → 待剪輯」。</p></div></div>
  <form class="form panel" id="upf">
  <label class="f">標題（給自己看的）<input type="text" id="u-title" required placeholder="例：週三課堂 合唱片段"></label>
  <div class="g2"><label class="f">類別<select id="u-cat">${opts(CAT, '教學')}</select></label></div>
  <div class="f">想發哪些平台<div class="row">${plats().map((p) => `<label class="chip"><input type="checkbox" name="u-pl" value="${esc(p)}" ${p !== 'LINE' ? 'checked' : ''}>${esc(p)}</label>`).join('')}</div></div>
  <label class="f">影片檔<input type="file" id="u-file" accept="video/*"></label>
  <label class="f">或貼雲端連結<input type="url" id="u-link" placeholder="https://drive.google.com/..."></label>
  <label class="f">想怎麼剪（給剪輯的人看）<textarea id="u-note" rows="3" placeholder="例：只要 0 分 30 秒到 1 分 20 秒，轉直式，上面加標題"></textarea></label>
  ${S.up.busy ? `<div class="bar2" aria-label="上傳進度"><i style="width:${S.up.pct}%"></i></div><p class="muted" style="margin:0">儲存中，請不要關掉頁面</p>` : ''}
  <div class="row"><button class="btn" ${S.up.busy ? 'disabled' : ''}>${S.up.busy ? '上傳中…' : '送出'}</button></div></form>`;
}
function vStudio() {
  const s = S.studio, t = TASKS.find((x) => x[0] === s.task) || TASKS[0], hasKey = S.settings?.hasKey;
  return `<div class="top"><div><h1>AI 文案工作室</h1><p class="sub">說一句發生了什麼，產出可以直接複製的文案。${hasKey ? '' : '還沒設定 AI 金鑰時，可以按「複製提示詞」貼到自己的 ChatGPT 或 Claude。'}</p></div></div>
  <div class="panel"><div class="chips">${TASKS.map(([k, n]) => `<button class="chip ${s.task === k ? 'on' : ''}" data-act="task" data-v="${k}">${n}</button>`).join('')}</div>
  <label class="f">${esc(t[2])}<textarea id="st-in" rows="5">${esc(s.input)}</textarea></label>
  <div class="row" style="margin-top:10px"><label class="f" style="flex:1 1 14em">要存到哪支影片（可不選）<select id="st-cid"><option value="">不存，只複製</option>${by(content(), 'updatedAt', -1).map((c) => `<option value="${esc(c.id)}" ${c.id === s.cid ? 'selected' : ''}>${esc(c.title)}</option>`).join('')}</select></label>
  <button class="btn" data-act="gen" ${s.busy || !hasKey ? 'disabled' : ''}>${s.busy ? '正在寫…' : '一鍵產生'}</button><button class="btn ghost" data-act="prompt">複製提示詞</button></div></div>
  <div class="out">${s.out.map((o, i) => `<div class="outc"><b>${esc(o.label)}</b><pre id="o${i}">${esc(o.text)}</pre><button class="btn sm ghost" data-act="copy" data-t="o${i}">複製</button></div>`).join('')}
  ${s.out.length && s.cid ? '<div class="row"><button class="btn" data-act="savecap">存進這支影片的文案欄</button></div>' : ''}</div>`;
}
function evCard(e) {
  const id = esc(e.id), f = (n, l, t = 'text') => `<label class="f">${l}<input type="${t}" data-id="${id}" data-f="${n}" value="${esc(e[n] || '')}"></label>`;
  const steps = e.steps || [];
  return `<article class="ev"><div class="date"><b>${md(e.date)}</b><span>${e.date ? wk(e.date) : ''} ${esc(e.time || '')}</span></div><div style="display:flex;flex-direction:column;gap:8px">
  <div class="row"><select class="status" aria-label="活動狀態" data-id="${id}" data-f="status" data-redraw="1">${opts(EST, e.status)}</select><span class="tag">${esc(e.type || '活動')}</span></div>
  <h3>${esc(e.name)}</h3><p class="muted" style="margin:0">${esc(e.place || '地點未定')} · 負責：${esc(e.role || '未填')}</p>
  <div class="sop" data-steps="${id}">${SOP.map((s, i) => `<label><input type="checkbox" ${steps[i] ? 'checked' : ''}>${i + 1}. ${s}</label>`).join('')}</div>
  <details><summary>流程、聯絡人與備忘</summary><div class="g2">${f('name', '活動名稱')}${f('date', '日期', 'date')}${f('time', '時間')}${f('place', '地點')}${f('contact', '聯絡人與電話')}${f('role', '負責項目')}</div><label class="f" style="margin-top:8px">流程與備忘<textarea rows="6" data-id="${id}" data-f="notes">${esc(e.notes || '')}</textarea></label></details>
  <details><summary>確認訊息</summary><textarea rows="8" data-id="${id}" data-f="confirm">${esc(e.confirm || '')}</textarea><div class="row" style="margin-top:8px"><button class="btn sm ghost" data-act="copyta">複製確認訊息</button></div></details>
  <div class="row"><button class="btn sm ghost" data-act="del" data-id="${id}">刪除</button><span class="muted">更新於 ${ago(e.updatedAt)}</span></div></div></article>`;
}
function vEvents() {
  const open = by(events().filter((e) => e.status !== '已結案'), 'date'), done = by(events().filter((e) => e.status === '已結案'), 'date', -1);
  const hasKey = S.settings?.hasKey;
  return `<div class="top"><div><h1>活動檔期</h1><p class="sub">每場活動走同樣六步。對話一亂，貼進來讓 AI 整理成檔期和確認訊息。</p></div><button class="btn ghost" data-act="newev">手動新增活動</button></div>
  <div class="panel" style="margin-bottom:18px"><h2>整理活動</h2><label class="f">把跟客戶或主辦的對話整段貼上<textarea id="ev-in" rows="5" placeholder="直接貼上對話紀錄，雜亂也沒關係">${esc(S.ev.text)}</textarea></label>
  <div class="row" style="margin-top:10px"><button class="btn" data-act="evai" ${S.ev.busy || !hasKey ? 'disabled' : ''}>${S.ev.busy ? '整理中…' : '整理成檔期'}</button><button class="btn ghost" data-act="evprompt">複製提示詞</button><span class="muted">${esc(S.ev.msg)}</span></div></div>
  <div class="evs">${open.length ? open.map(evCard).join('') : '<div class="empty">目前沒有進行中的活動。</div>'}</div>
  ${done.length ? `<details style="margin-top:18px"><summary>已結案（${done.length}）</summary><div class="evs">${done.map(evCard).join('')}</div></details>` : ''}`;
}
function vTemplates() {
  const b = S.settings?.brand || '我的品牌';
  return `<div class="top"><div><h1>範本庫</h1><p class="sub">【】裡換成當天的內容就能發。要依情況改寫，用「AI 文案」。</p></div></div>
  <div class="tpl">${TPL.map(([t, x], i) => `<div class="outc"><b>${t}</b><pre id="t${i}">${esc(x.replaceAll('{brand}', b))}</pre><button class="btn sm ghost" data-act="copy" data-t="t${i}">複製</button></div>`).join('')}</div>`;
}
function vSettings() {
  const s = S.settings || {}, area = (k, l, ph, r = 2) => `<label class="f">${l}<textarea id="s-${k}" rows="${r}" placeholder="${esc(ph)}">${esc(s[k] || '')}</textarea></label>`;
  return `<div class="top"><div><h1>設定</h1><p class="sub">AI 會照這裡的品牌資料寫文案。所有資料只存在這台裝置的瀏覽器裡。</p></div></div>
  <form class="form" id="setf" style="max-width:760px">
  <fieldset><legend>品牌</legend><div class="g2"><label class="f">品牌名稱<input type="text" id="s-brand" value="${esc(s.brand || '')}"></label><label class="f">品牌顏色<input type="color" id="s-accent" value="${esc(s.accent || '#c8102e')}"></label></div>
  ${area('intro', '一句話介紹', '例：陪你唱出好心情的歌唱老師')}${area('fields', '業務範圍', '例：歌唱教學、婚宴主持、活動表演')}${area('audience', '主要受眾', '例：想學唱歌的大人、找主持人的新人與廠商')}${area('tone', '說話語氣', '例：熱情、親切、專業，不浮誇')}${area('avoid', '不要用的字或話題', '例：最便宜、保證', 1)}
  <div class="f">我有經營的平台<div class="row">${ALL_PL.map((p) => `<label class="chip"><input type="checkbox" name="s-pl" value="${p}" ${plats().includes(p) ? 'checked' : ''}>${p}</label>`).join('')}</div></div></fieldset>
  <fieldset><legend>AI</legend><p class="muted" style="margin:0">金鑰只存在這台裝置的瀏覽器裡，AI 請求直接從這裡送到 AI 服務。請不要在公用電腦存金鑰。不填也能用「複製提示詞」。</p>
  <div class="row"><label class="chip"><input type="radio" name="s-prov" value="anthropic" ${s.aiProvider !== 'openai' ? 'checked' : ''}>Claude（Anthropic）</label><label class="chip"><input type="radio" name="s-prov" value="openai" ${s.aiProvider === 'openai' ? 'checked' : ''}>OpenAI 相容服務</label></div>
  <div class="g2"><label class="f">模型名稱<input type="text" id="s-model" value="${esc(s.aiModel || '')}" placeholder="例：claude-sonnet-5-5"></label><label class="f">服務網址（可不填）<input type="url" id="s-base" value="${esc(s.aiBaseUrl || '')}" placeholder="OpenAI 相容服務才需要，例：https://.../v1"></label></div>
  <label class="f">API 金鑰<input type="password" id="s-key" autocomplete="off" placeholder="${s.hasKey ? '已設定（尾碼 ' + esc(s.keyTail) + '），要換才填' : '貼上你的 API 金鑰'}"></label>
  <div class="g2"><label class="f">字幕模型（OpenAI 相容才有）<input type="text" id="s-stt" value="${esc(s.sttModel || 'whisper-1')}"></label></div>
  ${s.hasKey ? '<label class="chip" style="align-self:flex-start"><input type="checkbox" id="s-clear">刪除已存的金鑰</label>' : ''}</fieldset>
  <div class="row"><button class="btn">儲存設定</button></div></form>
  <section class="panel" style="max-width:760px;margin-top:18px"><h2>備份與搬家</h2><p class="muted">資料只存在這個瀏覽器。清除瀏覽器資料、換電腦或換瀏覽器前，先下載備份檔；到新地方再匯入。備份含內容、活動與設定，不含金鑰與影片檔。</p><p class="muted" id="usage"></p><div class="row"><button class="btn ghost" data-act="export">下載備份檔</button><label class="btn ghost">匯入備份檔<input type="file" id="imp" accept="application/json,.json" hidden></label></div></section>`;
}
const R = { home: vHome, content: vContent, upload: vUpload, studio: vStudio, events: vEvents, templates: vTemplates, settings: vSettings };

function draw() {
  const root = $('#root');
  if (!S.boot) { root.innerHTML = '<div class="gate"><p class="muted">載入中…</p></div>'; return; }
  if (!S.authed) { root.innerHTML = vGate(); return; }
  const y = window.scrollY;
  root.innerHTML = shell(R[S.view]());
  window.scrollTo(0, y);
  hydrate();
  const on = document.querySelector('.nav a.on');
  if (on && innerWidth < 900) on.scrollIntoView({ inline: 'center', block: 'nearest' });
}
async function hydrate() {
  for (const v of document.querySelectorAll('video[data-media]')) {
    const k = v.dataset.media;
    if (!mediaUrls.has(k)) { const blob = await window.LocalAPI.getMedia(k).catch(() => null); if (blob) mediaUrls.set(k, URL.createObjectURL(blob)); }
    if (mediaUrls.has(k)) v.src = mediaUrls.get(k); else { v.parentElement.classList.add('none'); v.replaceWith(Object.assign(document.createElement('span'), { textContent: '這台裝置上找不到影片檔（備份檔不含影片）' })); }
  }
  const u = document.getElementById('usage');
  if (u) { const x = await window.LocalAPI.usage(); if (x && x.quota) u.textContent = `目前用了 ${(x.used / 1048576).toFixed(0)} MB，瀏覽器可用空間約 ${(x.quota / 1073741824).toFixed(1)} GB。`; }
}
function route() { const h = location.hash.slice(1); S.view = R[h] ? h : 'home'; draw(); window.scrollTo(0, 0); }
window.addEventListener('hashchange', route);

// ===== 動作 =====
async function copy(text) { try { await navigator.clipboard.writeText(text); toast('已複製'); } catch (e) { toast('無法自動複製，請長按文字自行複製'); } }
function download(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  if (f.id === 'gate') {
    const pw = $('#pw').value, msg = $('#gmsg');
    if (!S.setup && pw !== $('#pw2').value) { msg.textContent = '兩次密碼不一樣'; return; }
    try { await api(S.setup ? '/api/login' : '/api/setup', { method: 'POST', body: { password: pw }, quiet: true }); S.setup = true; S.authed = true; await Promise.all([load(), loadSettings()]); route(); }
    catch (err) { msg.textContent = err.message; }
  }
  if (f.id === 'upf') upload();
  if (f.id === 'setf') saveSettings();
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.f && t.dataset.id) return patch(t.dataset.id, { [t.dataset.f]: t.value }, !!t.dataset.redraw);
  const pl = t.closest('[data-plats]');
  if (pl) return patch(pl.dataset.plats, { plats: [...pl.querySelectorAll('input:checked')].map((i) => i.value) });
  const sp = t.closest('[data-steps]');
  if (sp) return patch(sp.dataset.steps, { steps: [...sp.querySelectorAll('input')].map((i) => i.checked) });
  if (t.id === 'st-cid') S.studio.cid = t.value;
  if (t.id === 'imp' && t.files[0]) {
    t.files[0].text().then((txt) => window.LocalAPI.importData(JSON.parse(txt))).then(async (n) => { await Promise.all([load(), loadSettings()]); draw(); toast(`已匯入 ${n} 筆資料`); }).catch((err) => toast(err.message || '匯入失敗'));
  }
});
document.addEventListener('input', (e) => { if (e.target.id === 'st-in') S.studio.input = e.target.value; if (e.target.id === 'ev-in') S.ev.text = e.target.value; });
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'filter') { S.filter = b.dataset.v; if (location.hash !== '#content') return; e.preventDefault(); draw(); return; }
  e.preventDefault();
  if (a === 'dlvid') { const blob = await window.LocalAPI.getMedia(b.dataset.k); if (!blob) return toast('找不到影片檔'); const ext = b.dataset.k.split('.').pop(); const u = URL.createObjectURL(blob); const l = document.createElement('a'); l.href = u; l.download = (b.dataset.n || 'video') + '.' + ext; l.click(); setTimeout(() => URL.revokeObjectURL(u), 5000); return; }
  if (a === 'export') { const d = await window.LocalAPI.exportData(); download(`備份-${today()}.json`, JSON.stringify(d, null, 2)); return; }
  if (a === 'copy') return copy($('#' + b.dataset.t).textContent);
  if (a === 'copyta') return copy(b.closest('details').querySelector('textarea').value);
  if (a === 'task') { S.studio.task = b.dataset.v; return draw(); }
  if (a === 'ai') { const c = S.items.find((x) => x.id === b.dataset.id); S.studio = { task: 'all', input: c ? c.title + (c.note ? '。' + c.note : '') : '', out: [], busy: false, cid: b.dataset.id }; location.hash = '#studio'; return; }
  if (a === 'del') {
    if (S.armed !== b.dataset.id) { S.armed = b.dataset.id; b.textContent = '再按一次確定刪除'; setTimeout(() => { if (S.armed === b.dataset.id) { S.armed = null; b.textContent = '刪除'; } }, 3500); return; }
    S.armed = null;
    try { await api('/api/items/' + b.dataset.id, { method: 'DELETE' }); S.items = S.items.filter((x) => x.id !== b.dataset.id); toast('已刪除'); draw(); } catch (err) { toast(err.message); }
    return;
  }
  if (a === 'gen') return gen();
  if (a === 'prompt') { try { const r = await api('/api/prompt', { method: 'POST', body: { task: S.studio.task, input: S.studio.input, platforms: plats() } }); copy(r.prompt); } catch (err) { toast(err.message); } return; }
  if (a === 'evprompt') { try { const r = await api('/api/prompt', { method: 'POST', body: { task: 'event', input: S.ev.text } }); copy(r.prompt); } catch (err) { toast(err.message); } return; }
  if (a === 'savecap') { await patch(S.studio.cid, { captions: S.studio.out.map((o) => '【' + o.label + '】\n' + o.text).join('\n\n') }); toast('已存進影片卡片'); return; }
  if (a === 'evai') return evai();
  if (a === 'newev') { try { await api('/api/items', { method: 'POST', body: { kind: 'event', data: { name: '新活動（請改名）', type: '活動', date: today(), status: '詢問中', steps: [true] } } }); await load(); draw(); toast('已新增，展開「流程、聯絡人與備忘」填資料'); } catch (err) { toast(err.message); } return; }
  if (a === 'srt') { b.disabled = true; b.textContent = '產生中，影片越長越久…'; try { const r = await api('/api/transcribe', { method: 'POST', body: { id: b.dataset.id } }); const it = S.items.find((x) => x.id === b.dataset.id); if (it) it.srt = r.srt; draw(); toast('字幕已產生'); } catch (err) { toast(err.message); b.disabled = false; b.textContent = '產生字幕'; } return; }
  if (a === 'dlsrt') { const it = S.items.find((x) => x.id === b.dataset.id); if (it?.srt) download((it.title || 'subtitle') + '.srt', it.srt); return; }
});

function upload() {
  const title = $('#u-title').value.trim(), file = $('#u-file').files[0], link = $('#u-link').value.trim(), note = $('#u-note').value.trim();
  const ps = [...document.querySelectorAll('[name=u-pl]:checked')].map((i) => i.value), cat = $('#u-cat').value;
  if (!title) return toast('請先寫標題');
  if (!file && !link) return toast('請選影片檔，或貼雲端連結');
  if (link && !safeUrl(link)) return toast('連結要用 https:// 開頭');
  if (file && file.size > UPLOAD_MAX) return toast('檔案超過 1 GB，請先壓縮，或改貼雲端連結');
  const create = async (media) => {
    try { await api('/api/items', { method: 'POST', body: { kind: 'content', data: { title, cat, status: '待剪輯', media: media || '', link, note, plats: ps, scheduleAt: '', captions: '' } } }); await load(); S.up = { busy: false, pct: 0 }; S.filter = '待剪輯'; toast('已放進待剪輯'); location.hash = '#content'; }
    catch (err) { S.up = { busy: false, pct: 0 }; draw(); toast(err.message); }
  };
  if (!file) return create('');
  S.up = { busy: true, pct: 100 }; draw();
  window.LocalAPI.putMedia(file).then(create).catch(() => { S.up = { busy: false, pct: 0 }; draw(); toast('存檔失敗：瀏覽器空間可能不夠，請改貼雲端連結'); });
}
async function gen() {
  const s = S.studio;
  if (!s.input.trim()) return toast('請先寫一下內容');
  s.busy = true; s.out = []; draw();
  try { const r = await api('/api/ai', { method: 'POST', body: { task: s.task, input: s.input, platforms: (S.items.find((x) => x.id === s.cid)?.plats) || plats() } }); s.out = (Array.isArray(r.items) ? r.items : []).map((o) => ({ label: String(o.label || ''), text: String(o.text || '') })).filter((o) => o.text); if (!s.out.length) toast('AI 這次沒有給出內容，請再按一次'); }
  catch (err) { toast(err.message); }
  s.busy = false; draw();
}
async function evai() {
  const ev = S.ev; if (!ev.text.trim()) return toast('請先貼上對話');
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
  const body = { brand: v('s-brand').trim() || '我的品牌', accent: v('s-accent'), intro: v('s-intro'), fields: v('s-fields'), audience: v('s-audience'), tone: v('s-tone'), avoid: v('s-avoid'), platforms: [...document.querySelectorAll('[name=s-pl]:checked')].map((i) => i.value), aiProvider: document.querySelector('[name=s-prov]:checked').value, aiModel: v('s-model').trim(), aiBaseUrl: v('s-base').trim(), sttModel: v('s-stt').trim() };
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
  } catch (e) { toast('連不上伺服器，請重新整理'); }
  S.boot = true; route();
})();
}
