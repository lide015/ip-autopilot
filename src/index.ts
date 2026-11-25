/**
 * IP Autopilot 個人IP運營中控台 — Cloudflare Worker 後端
 * 單一使用者（擁有者）版本：密碼登入、內容與活動資料（D1）、影片（R2）、AI 文案與字幕（使用者自己的金鑰）。
 */

const SESSION_DAYS = 30;
const MAX_UPLOAD = 100 * 1024 * 1024; // Workers 免費方案單次請求上限
const MAX_STT = 25 * 1024 * 1024; // 語音轉文字服務常見上限
const PBKDF2_ITER = 100_000;
const KINDS = ["content", "event"] as const;
type Kind = (typeof KINDS)[number];

type Settings = {
  brand: string;
  intro: string;
  fields: string;
  audience: string;
  tone: string;
  avoid: string;
  accent: string;
  platforms: string[];
  aiProvider: "anthropic" | "openai";
  aiModel: string;
  aiBaseUrl: string;
  sttModel: string;
};

const DEFAULT_SETTINGS: Settings = {
  brand: "我的品牌",
  intro: "",
  fields: "",
  audience: "",
  tone: "熱情、親切、專業，不浮誇",
  avoid: "",
  accent: "#c8102e",
  platforms: ["TikTok", "YouTube", "Facebook", "Instagram", "LINE"],
  aiProvider: "anthropic",
  aiModel: "claude-sonnet-5-5",
  aiBaseUrl: "",
  sttModel: "whisper-1",
};

// ---------- 資料表：第一次啟動時自動建立，買家不用另外跑指令 ----------
const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('content', 'event')), data TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS items_kind_updated ON items (kind, updated_at DESC)",
  "CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires INTEGER NOT NULL)",
];
let schemaReady: Promise<unknown> | null = null; // 每個執行個體只檢查一次（不是請求狀態）
function ensureSchema(env: Env) {
  schemaReady ??= env.DB.batch(SCHEMA.map((q) => env.DB.prepare(q))).catch((e) => {
    schemaReady = null;
    throw e;
  });
  return schemaReady;
}

// ---------- 小工具 ----------
const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
const fail = (status: number, message: string) => json({ error: message }, status);
const enc = new TextEncoder();
const hex = (buf: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const fromHex = (s: string) => new Uint8Array(s.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
const sha256 = async (s: string) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
const log = (event: string, extra: Record<string, unknown> = {}) => console.log(JSON.stringify({ event, ...extra }));

async function kvGet(env: Env, k: string): Promise<string | null> {
  const row = await env.DB.prepare("SELECT v FROM kv WHERE k = ?").bind(k).first<{ v: string }>();
  return row ? row.v : null;
}
async function kvSet(env: Env, k: string, v: string) {
  await env.DB.prepare("INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(k, v).run();
}
async function getSettings(env: Env): Promise<Settings> {
  const raw = await kvGet(env, "settings");
  return { ...DEFAULT_SETTINGS, ...(raw ? (JSON.parse(raw) as Partial<Settings>) : {}) };
}

// ---------- 密碼與登入 ----------
async function hashPassword(password: string, saltHex?: string) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITER }, key, 256);
  return { salt: hex(salt), hash: hex(bits) };
}
async function verifyPassword(env: Env, password: string) {
  const stored = await kvGet(env, "password");
  if (!stored) return false;
  const { salt, hash } = JSON.parse(stored) as { salt: string; hash: string };
  const attempt = await hashPassword(password, salt);
  const a = fromHex(attempt.hash);
  const b = fromHex(hash);
  return a.byteLength === b.byteLength && crypto.subtle.timingSafeEqual(a, b);
}
async function newSession(env: Env) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const expires = Date.now() + SESSION_DAYS * 86400_000;
  await env.DB.prepare("INSERT INTO sessions (token_hash, expires) VALUES (?, ?)").bind(await sha256(token), expires).run();
  await env.DB.prepare("DELETE FROM sessions WHERE expires < ?").bind(Date.now()).run();
  return `sid=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}
function readCookie(req: Request, name: string) {
  const m = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : null;
}
async function isAuthed(req: Request, env: Env) {
  const token = readCookie(req, "sid");
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return false;
  const row = await env.DB.prepare("SELECT expires FROM sessions WHERE token_hash = ?").bind(await sha256(token)).first<{ expires: number }>();
  return !!row && row.expires > Date.now();
}
async function loginLocked(env: Env) {
  const raw = await kvGet(env, "login_fail");
  if (!raw) return false;
  const { count, at } = JSON.parse(raw) as { count: number; at: number };
  return count >= 5 && Date.now() - at < 10 * 60_000;
}
async function noteFail(env: Env, ok: boolean) {
  if (ok) return kvSet(env, "login_fail", JSON.stringify({ count: 0, at: 0 }));
  const raw = await kvGet(env, "login_fail");
  const prev = raw ? (JSON.parse(raw) as { count: number; at: number }) : { count: 0, at: 0 };
  const count = Date.now() - prev.at > 10 * 60_000 ? 1 : prev.count + 1;
  await kvSet(env, "login_fail", JSON.stringify({ count, at: Date.now() }));
}

// ---------- 資料 ----------
const isKind = (k: unknown): k is Kind => typeof k === "string" && (KINDS as readonly string[]).includes(k);
type Row = { id: string; kind: Kind; data: string; created_at: number; updated_at: number };
const toItem = (r: Row) => ({ id: r.id, kind: r.kind, ...JSON.parse(r.data), createdAt: r.created_at, updatedAt: r.updated_at });
function clean(data: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (!["id", "kind", "createdAt", "updatedAt"].includes(k)) out[k] = v;
  return out;
}

// ---------- AI ----------
const TASKS: Record<string, { name: string; guide: string }> = {
  all: { name: "一支影片發全部平台", guide: "依使用者的平台各輸出一項：TikTok（封面字 12 字內＋說明＋5 個 hashtag）、YouTube Shorts（標題 30 字內＋說明＋hashtag）、Facebook 貼文（150 字內，結尾一個行動呼籲）、Instagram（說明＋hashtag）、LINE 訊息（80 字內）。只輸出使用者有勾選的平台。" },
  short: { name: "短影音標題與說明", guide: "輸出 3 個不同角度的版本，每個含封面字（12 字內）、一句說明、5 個 hashtag。" },
  post: { name: "社群貼文", guide: "輸出 2 個版本：溫暖版、活潑版，各 150 字內，結尾一個行動呼籲。" },
  notice: { name: "群組通知", guide: "輸出 1 則通知，重點條列，120 字內，最後一句問候。" },
  sales: { name: "招生或銷售文案", guide: "輸出 2 項：完整貼文、可轉傳的短版。" },
  reply: { name: "難回訊息的高情商回覆", guide: "輸出 3 個版本：溫和婉轉、折衷提案、堅守立場。每個都給對方台階與面子，但不失專業與底線。標籤寫出各自適合的情況。" },
  script: { name: "主持或直播串場稿", guide: "依流程分段輸出，每段一項，口語、好念。" },
  week: { name: "本週內容包", guide: "輸出 7 項：3 篇社群貼文、3 支短影音（封面字＋說明＋hashtag）、1 則群組通知。主題平均分配在專業實力、教學或知識分享、幕後與生活。" },
};
const OUTPUT = '只回傳 JSON，不要其他文字，格式：{"items":[{"label":"項目名稱","text":"可直接複製的完整內容"}]}';
const EVENT_OUTPUT =
  '只回傳 JSON：{"name":"活動名稱","type":"活動類型","date":"YYYY-MM-DD 或空字串","time":"","place":"","contact":"聯絡人與電話","role":"我負責的項目","flow":["流程每一段"],"needs":["要準備的東西"],"open":["還沒確認的事"],"confirm":"一則傳給對方的確認訊息全文：熱情有禮，條列日期時間地點負責項目，最後列出還沒確認的事"}';

function systemPrompt(s: Settings) {
  return [
    `你是「${s.brand}」的社群運營助理。`,
    s.intro && `品牌介紹：${s.intro}`,
    s.fields && `業務範圍：${s.fields}`,
    s.audience && `主要受眾：${s.audience}`,
    `語氣：${s.tone}。`,
    s.avoid && `不要使用：${s.avoid}`,
    "用繁體中文與台灣用語。每段最多 2 個表情符號。",
    "絕對不要編造使用者沒提供的事實（日期、地點、人名、價格、獎項、數字）；缺少的資訊用【待填：項目】標出。",
    "公開貼文不放價格、客戶全名與電話。",
  ]
    .filter(Boolean)
    .join("\n");
}
function buildPrompt(s: Settings, task: string, input: string, platforms: string[]) {
  const today = new Date().toISOString().slice(0, 10);
  if (task === "event")
    return `以下是跟客戶或主辦的對話，請整理成活動資料。今天是 ${today}，日期換算成 YYYY-MM-DD，對話沒提到的欄位留空字串，不要猜。\n對話：\n${input}\n\n${EVENT_OUTPUT}`;
  const t = TASKS[task] ?? TASKS.post;
  return `任務：${t.name}\n使用者的平台：${(platforms.length ? platforms : s.platforms).join("、")}\n素材：${input}\n要求：${t.guide}\n\n${OUTPUT}`;
}
function parseJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI 沒有回傳可讀的格式");
  return JSON.parse(text.slice(start, end + 1));
}
async function callAI(env: Env, s: Settings, system: string, user: string) {
  const key = await kvGet(env, "ai_key");
  if (!key) throw new Error("還沒設定 AI 金鑰，請到「設定」填寫，或改用「複製提示詞」");
  let res: Response;
  if (s.aiProvider === "anthropic") {
    res = await fetch(`${s.aiBaseUrl || "https://api.anthropic.com"}/v1/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: s.aiModel, max_tokens: 4000, system, messages: [{ role: "user", content: user }] }),
    });
  } else {
    res = await fetch(`${(s.aiBaseUrl || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: s.aiModel, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    });
  }
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    log("ai_error", { status: res.status, provider: s.aiProvider });
    throw new Error(res.status === 401 ? "AI 金鑰無效，請到「設定」檢查" : `AI 服務回應錯誤（${res.status}）：${body}`);
  }
  const out = (await res.json()) as { content?: { type: string; text?: string }[]; choices?: { message?: { content?: string } }[] };
  const text = s.aiProvider === "anthropic" ? (out.content || []).map((c) => c.text || "").join("") : out.choices?.[0]?.message?.content || "";
  return parseJson(text);
}

// ---------- 影片 ----------
async function serveMedia(req: Request, env: Env, key: string) {
  const obj = await env.MEDIA.get(key, { range: req.headers, onlyIf: req.headers });
  if (!obj) return fail(404, "找不到影片");
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set("etag", obj.httpEtag);
  h.set("accept-ranges", "bytes");
  h.set("cache-control", "private, max-age=3600");
  const url = new URL(req.url);
  if (url.searchParams.get("dl")) h.set("content-disposition", `attachment; filename="${key.split("/").pop()}"`);
  if (!("body" in obj) || !obj.body) return new Response(null, { status: 304, headers: h });
  if (req.headers.has("range") && obj.range) {
    const r = obj.range as { offset?: number; length?: number; suffix?: number };
    const off = r.suffix !== undefined ? obj.size - r.suffix : r.offset ?? 0;
    const len = r.suffix !== undefined ? r.suffix : r.length ?? obj.size - off;
    h.set("content-range", `bytes ${off}-${off + len - 1}/${obj.size}`);
    h.set("content-length", String(len));
    return new Response(obj.body, { status: 206, headers: h });
  }
  h.set("content-length", String(obj.size));
  return new Response(obj.body, { headers: h });
}
async function transcribe(env: Env, s: Settings, mediaKey: string) {
  if (s.aiProvider !== "openai") throw new Error("自動字幕需要 OpenAI 相容的語音服務，請在「設定」選擇 OpenAI 相容並填金鑰");
  const key = await kvGet(env, "ai_key");
  if (!key) throw new Error("還沒設定 AI 金鑰");
  const obj = await env.MEDIA.get(mediaKey);
  if (!obj) throw new Error("找不到影片");
  if (obj.size > MAX_STT) throw new Error("影片超過 25 MB，請先剪短或壓縮再產生字幕");
  const form = new FormData();
  form.append("file", new File([await obj.arrayBuffer()], "video.mp4", { type: obj.httpMetadata?.contentType || "video/mp4" }));
  form.append("model", s.sttModel || "whisper-1");
  form.append("response_format", "srt");
  form.append("language", "zh");
  const res = await fetch(`${(s.aiBaseUrl || "https://api.openai.com/v1").replace(/\/$/, "")}/audio/transcriptions`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) throw new Error(`字幕服務回應錯誤（${res.status}）`);
  return await res.text();
}

// ---------- 路由 ----------
async function api(req: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname;
  const method = req.method;
  const body = async <T>() => (await req.json().catch(() => ({}))) as T;

  if (method !== "GET" && req.headers.get("x-app") !== "1") return fail(403, "請從網站操作");

  if (path === "/api/state" && method === "GET") {
    const setup = !!(await kvGet(env, "password"));
    const authed = setup && (await isAuthed(req, env));
    const s = await getSettings(env);
    return json({ setup, authed, brand: s.brand, accent: s.accent });
  }
  if (path === "/api/setup" && method === "POST") {
    if (await kvGet(env, "password")) return fail(409, "已經設定過密碼");
    const { password } = await body<{ password?: string }>();
    if (!password || password.length < 8) return fail(400, "密碼至少 8 個字");
    await kvSet(env, "password", JSON.stringify(await hashPassword(password)));
    log("setup_done");
    return json({ ok: true }, 200, { "set-cookie": await newSession(env) });
  }
  if (path === "/api/login" && method === "POST") {
    if (await loginLocked(env)) return fail(429, "錯太多次了，請 10 分鐘後再試");
    const { password } = await body<{ password?: string }>();
    const ok = !!password && (await verifyPassword(env, password));
    await noteFail(env, ok);
    if (!ok) return fail(401, "密碼不對");
    return json({ ok: true }, 200, { "set-cookie": await newSession(env) });
  }

  if (!(await isAuthed(req, env))) return fail(401, "請先登入");

  if (path === "/api/logout" && method === "POST") {
    const token = readCookie(req, "sid");
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
    return json({ ok: true }, 200, { "set-cookie": "sid=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" });
  }
  if (path === "/api/password" && method === "POST") {
    const { current, next } = await body<{ current?: string; next?: string }>();
    if (!current || !(await verifyPassword(env, current))) return fail(401, "目前密碼不對");
    if (!next || next.length < 8) return fail(400, "新密碼至少 8 個字");
    await kvSet(env, "password", JSON.stringify(await hashPassword(next)));
    await env.DB.prepare("DELETE FROM sessions").run();
    return json({ ok: true }, 200, { "set-cookie": await newSession(env) });
  }

  if (path === "/api/settings" && method === "GET") {
    const key = await kvGet(env, "ai_key");
    return json({ ...(await getSettings(env)), hasKey: !!key, keyTail: key ? key.slice(-4) : "" });
  }
  if (path === "/api/settings" && method === "PUT") {
    const b = await body<Partial<Settings> & { aiKey?: string }>();
    const cur = await getSettings(env);
    const next: Settings = { ...cur };
    for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
      if (b[k] === undefined) continue;
      if (k === "platforms") next.platforms = Array.isArray(b.platforms) ? b.platforms.map(String).slice(0, 12) : cur.platforms;
      else if (k === "aiProvider") next.aiProvider = b.aiProvider === "openai" ? "openai" : "anthropic";
      else (next as Record<string, unknown>)[k] = String(b[k]).slice(0, 2000);
    }
    if (next.aiBaseUrl && !/^https:\/\//.test(next.aiBaseUrl)) return fail(400, "AI 服務網址要用 https:// 開頭");
    if (!/^#[0-9a-fA-F]{6}$/.test(next.accent)) next.accent = DEFAULT_SETTINGS.accent;
    await kvSet(env, "settings", JSON.stringify(next));
    if (typeof b.aiKey === "string") {
      if (b.aiKey === "") await env.DB.prepare("DELETE FROM kv WHERE k = 'ai_key'").run();
      else await kvSet(env, "ai_key", b.aiKey.trim());
    }
    return json({ ok: true });
  }

  if (path === "/api/items" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM items ORDER BY updated_at DESC LIMIT 2000").all<Row>();
    return json({ items: results.map(toItem) });
  }
  if (path === "/api/items" && method === "POST") {
    const b = await body<{ kind?: string; data?: Record<string, unknown> }>();
    if (!isKind(b.kind) || !b.data || typeof b.data !== "object") return fail(400, "資料格式不對");
    const id = crypto.randomUUID();
    const now = Date.now();
    await env.DB.prepare("INSERT INTO items (id, kind, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .bind(id, b.kind, JSON.stringify(clean(b.data)), now, now)
      .run();
    return json({ id });
  }
  const itemMatch = path.match(/^\/api\/items\/([0-9a-f-]{36})$/);
  if (itemMatch) {
    const id = itemMatch[1];
    const row = await env.DB.prepare("SELECT * FROM items WHERE id = ?").bind(id).first<Row>();
    if (!row) return fail(404, "找不到這筆資料");
    if (method === "PATCH") {
      const patch = clean(await body<Record<string, unknown>>());
      const merged = { ...JSON.parse(row.data), ...patch };
      await env.DB.prepare("UPDATE items SET data = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(merged), Date.now(), id).run();
      return json({ ok: true });
    }
    if (method === "DELETE") {
      const data = JSON.parse(row.data) as { media?: string; edited?: string };
      for (const k of [data.media, data.edited]) if (k) await env.MEDIA.delete(k);
      await env.DB.prepare("DELETE FROM items WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }
  }

  if (path === "/api/upload" && method === "PUT") {
    const size = Number(req.headers.get("content-length") || 0);
    if (!size || !req.body) return fail(400, "沒有收到檔案");
    if (size > MAX_UPLOAD) return fail(413, "檔案超過 100 MB，請先壓縮，或改貼雲端連結");
    const type = req.headers.get("content-type") || "application/octet-stream";
    if (!/^video\/|^image\//.test(type)) return fail(415, "只能上傳影片或圖片");
    const ext = (url.searchParams.get("name") || "").split(".").pop()?.replace(/[^a-z0-9]/gi, "").slice(0, 5) || "mp4";
    const key = `media/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
    await env.MEDIA.put(key, req.body, { httpMetadata: { contentType: type } });
    log("upload", { size });
    return json({ key, size });
  }

  if (path === "/api/prompt" && method === "POST") {
    const b = await body<{ task?: string; input?: string; platforms?: string[] }>();
    const s = await getSettings(env);
    return json({ prompt: `${systemPrompt(s)}\n\n${buildPrompt(s, b.task || "post", b.input || "", b.platforms || [])}` });
  }
  if (path === "/api/ai" && method === "POST") {
    const b = await body<{ task?: string; input?: string; platforms?: string[] }>();
    if (!b.input?.trim()) return fail(400, "請先寫一下內容");
    const s = await getSettings(env);
    try {
      const out = await callAI(env, s, systemPrompt(s), buildPrompt(s, b.task || "post", b.input, b.platforms || []));
      return json(out);
    } catch (e) {
      return fail(502, e instanceof Error ? e.message : "AI 產生失敗");
    }
  }
  if (path === "/api/transcribe" && method === "POST") {
    const { id } = await body<{ id?: string }>();
    const row = id ? await env.DB.prepare("SELECT * FROM items WHERE id = ?").bind(id).first<Row>() : null;
    if (!row) return fail(404, "找不到這支影片");
    const data = JSON.parse(row.data) as { media?: string; edited?: string };
    const key = data.edited || data.media;
    if (!key) return fail(400, "這張卡片沒有上傳影片檔");
    try {
      const srt = await transcribe(env, await getSettings(env), key);
      await env.DB.prepare("UPDATE items SET data = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify({ ...data, srt }), Date.now(), row.id).run();
      return json({ srt });
    } catch (e) {
      return fail(502, e instanceof Error ? e.message : "字幕產生失敗");
    }
  }

  if (path === "/api/export" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT * FROM items ORDER BY created_at").all<Row>();
    return json(
      { exportedAt: new Date().toISOString(), settings: await getSettings(env), items: results.map(toItem) },
      200,
      { "content-disposition": `attachment; filename="backup-${new Date().toISOString().slice(0, 10)}.json"` },
    );
  }

  return fail(404, "找不到這個功能");
}

export default {
  async fetch(req, env): Promise<Response> {
    const url = new URL(req.url);
    try {
      if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/media/")) await ensureSchema(env);
      if (url.pathname.startsWith("/api/")) return await api(req, env, url);
      if (url.pathname.startsWith("/media/")) {
        if (!(await isAuthed(req, env))) return fail(401, "請先登入");
        return await serveMedia(req, env, decodeURIComponent(url.pathname.slice(1)));
      }
      return env.ASSETS.fetch(req);
    } catch (e) {
      log("unhandled", { path: url.pathname, message: e instanceof Error ? e.message : String(e) });
      return fail(500, "系統暫時出錯，請再試一次");
    }
  },
} satisfies ExportedHandler<Env>;
