/*
 * 本機版後端（Backend adapter）：資料、影片、設定都存在這個瀏覽器的 IndexedDB。
 * 介面與 cloud/public/cloud-adapter.js 完全相同，app.js 不需要知道自己跑在哪個版本。
 * 介面：features、call(path, opt)、putMedia(file, onProgress)、mediaUrl(key)、
 *       downloadMedia(key, name)、exportData()、importData(data)、usage()
 */
window.Backend = (() => {
  const DEFAULT_SETTINGS = {
    brand: '我的品牌', intro: '', fields: '', audience: '', tone: '熱情、親切、專業，不浮誇', avoid: '',
    accent: '#c8102e', platforms: ['TikTok', 'YouTube', 'Facebook', 'Instagram', 'LINE'],
    aiProvider: 'anthropic', aiModel: 'claude-sonnet-5-5', aiBaseUrl: '', sttModel: 'whisper-1', engineRepo: '',
  };
  const MAX_STT = 25 * 1024 * 1024;

  // ---------- IndexedDB ----------
  let dbp = null;
  function open() {
    dbp = dbp || new Promise((res, rej) => {
      const r = indexedDB.open('ip-autopilot', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        d.createObjectStore('items', { keyPath: 'id' });
        d.createObjectStore('kv');
        d.createObjectStore('media');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function run(store, mode, fn) {
    const d = await open();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode);
      const req = fn(t.objectStore(store));
      t.oncomplete = () => res(req ? req.result : undefined);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error || new Error('儲存失敗'));
    });
  }
  const get = (s, k) => run(s, 'readonly', (o) => o.get(k));
  const all = (s) => run(s, 'readonly', (o) => o.getAll());
  const put = (s, v, k) => run(s, 'readwrite', (o) => (k === undefined ? o.put(v) : o.put(v, k)));
  const del = (s, k) => run(s, 'readwrite', (o) => o.delete(k));
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));

  async function settings() { return { ...DEFAULT_SETTINGS, ...((await get('kv', 'settings')) || {}) }; }

  // ---------- AI 提示詞（與雲端版相同） ----------
  const TASKS = {
    all: ['一支影片發全部平台', '依使用者的平台各輸出一項：TikTok（封面字 12 字內＋說明＋5 個 hashtag）、YouTube Shorts（標題 30 字內＋說明＋hashtag）、Facebook 貼文（150 字內，結尾一個行動呼籲）、Instagram（說明＋hashtag）、LINE 訊息（80 字內）。只輸出使用者有勾選的平台。'],
    short: ['短影音標題與說明', '輸出 3 個不同角度的版本，每個含封面字（12 字內）、一句說明、5 個 hashtag。'],
    post: ['社群貼文', '輸出 2 個版本：溫暖版、活潑版，各 150 字內，結尾一個行動呼籲。'],
    notice: ['群組通知', '輸出 1 則通知，重點條列，120 字內，最後一句問候。'],
    sales: ['招生或銷售文案', '輸出 2 項：完整貼文、可轉傳的短版。'],
    reply: ['難回訊息的高情商回覆', '輸出 3 個版本：溫和婉轉、折衷提案、堅守立場。每個都給對方台階與面子，但不失專業與底線。標籤寫出各自適合的情況。'],
    script: ['主持或直播串場稿', '依流程分段輸出，每段一項，口語、好念。'],
    promo: ['新歌／演出宣傳', '輸出 4 項：IG 貼文（150 字內，結尾一個行動呼籲＋5 個 hashtag）、IG 限時動態短句（3 句，每句 15 字內）、TikTok／YouTube Shorts 說明（封面字 12 字內＋一句說明＋5 個 hashtag）、LINE 群組提醒（80 字內）。缺少日期、地點、票價等資訊時用【待填：項目】。'],
    week: ['本週內容包', '輸出 7 項：3 篇社群貼文、3 支短影音（封面字＋說明＋hashtag）、1 則群組通知。主題平均分配在專業實力、教學或知識分享、幕後與生活。'],
  };
  const OUTPUT = '只回傳 JSON，不要其他文字，格式：{"items":[{"label":"項目名稱","text":"可直接複製的完整內容"}]}';
  const EVENT_OUTPUT = '只回傳 JSON：{"name":"活動名稱","type":"活動類型","date":"YYYY-MM-DD 或空字串","time":"","place":"","contact":"聯絡人與電話","role":"我負責的項目","flow":["流程每一段"],"needs":["要準備的東西"],"open":["還沒確認的事"],"confirm":"一則傳給對方的確認訊息全文：熱情有禮，條列日期時間地點負責項目，最後列出還沒確認的事"}';
  function systemPrompt(s) {
    return [
      `你是「${s.brand}」的社群運營助理。`,
      s.intro && `品牌介紹：${s.intro}`,
      s.fields && `業務範圍：${s.fields}`,
      s.audience && `主要受眾：${s.audience}`,
      `語氣：${s.tone}。`,
      s.avoid && `不要使用：${s.avoid}`,
      '用繁體中文與台灣用語。每段最多 2 個表情符號。',
      '絕對不要編造使用者沒提供的事實（日期、地點、人名、價格、獎項、數字）；缺少的資訊用【待填：項目】標出。',
      '公開貼文不放價格、客戶全名與電話。',
    ].filter(Boolean).join('\n');
  }
  function buildPrompt(s, task, input, platforms) {
    const today = new Date().toISOString().slice(0, 10);
    if (task === 'event') return `以下是跟客戶或主辦的對話，請整理成活動資料。今天是 ${today}，日期換算成 YYYY-MM-DD，對話沒提到的欄位留空字串，不要猜。\n對話：\n${input}\n\n${EVENT_OUTPUT}`;
    const t = TASKS[task] || TASKS.post;
    return `任務：${t[0]}\n使用者的平台：${(platforms && platforms.length ? platforms : s.platforms).join('、')}\n素材：${input}\n要求：${t[1]}\n\n${OUTPUT}`;
  }
  function parseJson(text) {
    const a = text.indexOf('{'), b = text.lastIndexOf('}');
    if (a < 0 || b <= a) throw new Error('AI 沒有回傳可讀的格式，請再試一次');
    return JSON.parse(text.slice(a, b + 1));
  }
  async function callAI(s, system, user) {
    const key = await get('kv', 'ai_key');
    if (!key) throw new Error('還沒設定 AI 金鑰，請到「設定」填寫，或改用「複製提示詞」');
    let res;
    try {
      if (s.aiProvider === 'anthropic') {
        res = await fetch(`${s.aiBaseUrl || 'https://api.anthropic.com'}/v1/messages`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({ model: s.aiModel, max_tokens: 4000, system, messages: [{ role: 'user', content: user }] }),
        });
      } else {
        res = await fetch(`${(s.aiBaseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
          body: JSON.stringify({ model: s.aiModel, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
        });
      }
    } catch (e) { throw new Error('連不上 AI 服務，請檢查網路或服務網址'); }
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      throw new Error(res.status === 401 ? 'AI 金鑰無效，請到「設定」檢查' : `AI 服務回應錯誤（${res.status}）：${body}`);
    }
    const out = await res.json();
    const text = s.aiProvider === 'anthropic' ? (out.content || []).map((c) => c.text || '').join('') : (out.choices && out.choices[0] && out.choices[0].message && out.choices[0].message.content) || '';
    return parseJson(text);
  }
  async function transcribe(s, mediaKey) {
    if (s.aiProvider !== 'openai') throw new Error('自動字幕需要 OpenAI 相容的語音服務，請在「設定」選擇 OpenAI 相容並填金鑰');
    const key = await get('kv', 'ai_key');
    if (!key) throw new Error('還沒設定 AI 金鑰');
    const blob = await get('media', mediaKey);
    if (!blob) throw new Error('找不到影片');
    if (blob.size > MAX_STT) throw new Error('影片超過 25 MB，請先剪短或壓縮再產生字幕');
    const form = new FormData();
    form.append('file', blob, 'video.mp4');
    form.append('model', s.sttModel || 'whisper-1');
    form.append('response_format', 'srt');
    form.append('language', 'zh');
    const res = await fetch(`${(s.aiBaseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/audio/transcriptions`, { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: form });
    if (!res.ok) throw new Error(`字幕服務回應錯誤（${res.status}）`);
    return res.text();
  }

  const clean = (d) => { const o = { ...d }; delete o.id; delete o.kind; delete o.createdAt; delete o.updatedAt; return o; };

  // ---------- 與雲端版相同的路徑 ----------
  async function call(path, opt = {}) {
    const m = opt.method || 'GET', b = opt.body || {};
    if (path === '/api/state') { const s = await settings(); return { setup: true, authed: true, brand: s.brand, accent: s.accent, local: true }; }
    if (path === '/api/settings' && m === 'GET') { const key = await get('kv', 'ai_key'); return { ...(await settings()), hasKey: !!key, keyTail: key ? key.slice(-4) : '' }; }
    if (path === '/api/settings' && m === 'PUT') {
      const cur = await settings(), next = { ...cur };
      for (const k of Object.keys(DEFAULT_SETTINGS)) if (b[k] !== undefined) next[k] = k === 'platforms' ? (Array.isArray(b[k]) ? b[k].map(String) : cur[k]) : String(b[k]).slice(0, 2000);
      if (next.aiProvider !== 'openai') next.aiProvider = 'anthropic';
      if (next.aiBaseUrl && !/^https:\/\//.test(next.aiBaseUrl)) throw new Error('AI 服務網址要用 https:// 開頭');
      if (next.engineRepo && !/^[\w.-]+\/[\w.-]+$/.test(next.engineRepo)) throw new Error('剪輯引擎要寫成「帳號/倉庫名」');
      if (!/^#[0-9a-fA-F]{6}$/.test(next.accent)) next.accent = DEFAULT_SETTINGS.accent;
      await put('kv', next, 'settings');
      if (typeof b.aiKey === 'string') { if (b.aiKey === '') await del('kv', 'ai_key'); else await put('kv', b.aiKey.trim(), 'ai_key'); }
      return { ok: true };
    }
    if (path === '/api/items' && m === 'GET') return { items: (await all('items')).sort((x, y) => y.updatedAt - x.updatedAt) };
    if (path === '/api/items' && m === 'POST') {
      if (!['content', 'event'].includes(b.kind) || !b.data) throw new Error('資料格式不對');
      const id = uuid(), now = Date.now();
      await put('items', { ...clean(b.data), id, kind: b.kind, createdAt: now, updatedAt: now });
      return { id };
    }
    const im = path.match(/^\/api\/items\/(.+)$/);
    if (im) {
      const it = await get('items', im[1]);
      if (!it) throw new Error('找不到這筆資料');
      if (m === 'PATCH') { await put('items', { ...it, ...clean(b), updatedAt: Date.now() }); return { ok: true }; }
      if (m === 'DELETE') { for (const k of [it.media, it.edited]) if (k) await del('media', k); await del('items', it.id); return { ok: true }; }
    }
    if (path === '/api/prompt') { const s = await settings(); return { prompt: `${systemPrompt(s)}\n\n${buildPrompt(s, b.task || 'post', b.input || '', b.platforms || [])}` }; }
    if (path === '/api/ai') {
      if (!b.input || !String(b.input).trim()) throw new Error('請先寫一下內容');
      const s = await settings();
      return callAI(s, systemPrompt(s), buildPrompt(s, b.task || 'post', b.input, b.platforms || []));
    }
    if (path === '/api/transcribe') {
      const it = await get('items', b.id);
      const key = it && (it.edited || it.media);
      if (!key) throw new Error('這張卡片沒有影片檔');
      const srt = await transcribe(await settings(), key);
      await put('items', { ...it, srt, updatedAt: Date.now() });
      return { srt };
    }
    throw new Error('找不到這個功能');
  }

  // ---------- 影片與備份 ----------
  const urls = new Map();
  async function putMedia(file, onProgress) {
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* 不支援就略過 */ }
    const ext = (file.name.split('.').pop() || 'mp4').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'mp4';
    const key = `media/${uuid()}.${ext}`;
    await put('media', file, key);
    if (onProgress) onProgress(100);
    return key;
  }
  async function mediaUrl(key) {
    if (urls.has(key)) return urls.get(key);
    const blob = await get('media', key).catch(() => null);
    if (!blob) return null;
    const u = URL.createObjectURL(blob);
    urls.set(key, u);
    return u;
  }
  async function downloadMedia(key, name) {
    const blob = await get('media', key);
    if (!blob) throw new Error('這台裝置上找不到影片檔');
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u; a.download = `${name || 'video'}.${key.split('.').pop()}`; a.click();
    setTimeout(() => URL.revokeObjectURL(u), 5000);
  }
  async function exportData() { return { app: 'ip-autopilot', version: 1, exportedAt: new Date().toISOString(), settings: await settings(), items: await all('items') }; }
  async function importData(data) {
    if (!data || data.app !== 'ip-autopilot' || !Array.isArray(data.items)) throw new Error('這不是本系統的備份檔');
    if (data.settings) await put('kv', { ...DEFAULT_SETTINGS, ...data.settings }, 'settings');
    let n = 0;
    for (const it of data.items) if (it && it.id && ['content', 'event'].includes(it.kind)) { await put('items', it); n++; }
    return n;
  }
  async function usage() { try { const e = await navigator.storage.estimate(); return { used: e.usage || 0, quota: e.quota || 0 }; } catch (e) { return null; } }
  const features = { login: false, local: true, uploadMax: 1024 * 1024 * 1024, uploadNote: '影片會存在這個瀏覽器裡（1 GB 以內）', keyNote: '金鑰只存在這台裝置的瀏覽器裡，AI 請求直接從這裡送到 AI 服務。請不要在公用電腦存金鑰。' };
  return { features, call, putMedia, mediaUrl, downloadMedia, exportData, importData, usage };
})();
