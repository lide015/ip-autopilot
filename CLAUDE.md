# 個人IP運營中控台：給 AI 的專案規則

這是一個賣給「經營個人品牌的人」的數位商品。使用者多半不是工程師，用手機的比例很高。

## 一定要遵守

- 介面文字、說明文件、PR 說明、回覆留言一律用**白話繁體中文（台灣用語）**。程式碼註解也用繁中。
- 網站與範例資料裡**不放任何真實個人的姓名、暱稱或細節**；範例一律用「範例工作室」「週三課堂」這類中性內容。
- **兩個版本共用同一套畫面**：只改根目錄的 `app.js`、`app.css`，改完執行 `node scripts/sync-cloud.mjs`。絕對不要直接改 `cloud/public/app.js` 或 `cloud/public/app.css`。
- 新增或修改資料操作時，**兩個 adapter 都要改**：`store.js`（本機版）與 `cloud/public/cloud-adapter.js`＋`cloud/src/index.ts`（雲端版），介面必須一致。
- AI 提示詞（`TASKS`、`systemPrompt`、`buildPrompt`）在 `store.js` 與 `cloud/src/index.ts` 各有一份，**兩份要一起改、內容一致**。
- 從資料庫、AI、使用者輸入來的字，放進 HTML 前一律經過 `esc()`；外部連結只接受 `https://`（用 `safeUrl()`）。
- 金鑰只能存在使用者自己的瀏覽器或自己的雲端資料庫，不能寫進程式碼、不能送到第三方、不能出現在備份檔。
- 不加任何建置步驟或框架：本機版必須能「雙擊 index.html」就用。外部只允許 Google Fonts。

## 完成前一定要做

1. `npm test`（同步檢查＋語法檢查＋瀏覽器全流程測試）全部通過。
2. 改到雲端版：`cd cloud && npx wrangler types && npx tsc --noEmit` 通過。
3. 改到畫面：照 `.claude/skills/site-ui/SKILL.md` 的檢查表自我審核，手機 375 寬與桌機 1280 寬、淺色與深色都要能用。
4. 新功能要在 `tests/smoke.mjs` 加測試；更新 `CHANGELOG.md`。
5. PR 說明用繁中寫：改了什麼、使用者會看到什麼差別、怎麼測的。

## 技能庫（`.claude/skills/`）

| 技能 | 什麼時候用 |
| --- | --- |
| `site-feature` | 新增或修改任何功能（從需求到 PR 的完整流程） |
| `site-ui` | 動到畫面、文字、版面、互動時 |
| `site-ai-prompts` | 新增或調整 AI 文案任務、提示詞 |
| `site-test` | 驗證改動、補測試 |
| `site-review` | 審查別人（或自己）的 PR |
| `site-release` | 發佈新版本 |

## 檔案地圖

```
index.html / app.js / app.css   共用畫面（本機版入口）
store.js                        本機版 adapter（IndexedDB＋瀏覽器直呼 AI）
cloud/public/cloud-adapter.js   雲端版 adapter（呼叫 /api）
cloud/src/index.ts              雲端版後端（Cloudflare Workers + D1 + R2）
scripts/sync-cloud.mjs          把共用畫面同步到 cloud/public/
tests/smoke.mjs                 瀏覽器全流程測試
docs/                           架構、agent 工作流說明
```
