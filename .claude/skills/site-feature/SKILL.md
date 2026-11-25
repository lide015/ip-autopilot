---
name: site-feature
description: 在個人IP運營中控台新增或修改功能的完整流程，從讀需求、設計資料、改兩個版本、測試到開 PR。收到 @claude 功能需求或要改任何行為時使用。
---

# 新增或修改功能

## 1. 弄清楚需求（不要猜）
- 讀 issue 全文與留言。用一句話寫下「使用者會多做到什麼事」。
- 需求有兩種以上合理解讀、而且做錯要重工時，先在 issue 留言問**一個**問題再動手；其他情況照最合理的解讀做，並在 PR 說明寫出你的假設。
- 超出這個產品定位（個人品牌運營）的需求，留言說明並建議替代做法，不要硬做。

## 2. 決定動到哪幾層
| 需要 | 改哪裡 |
| --- | --- |
| 只是畫面、文字、版面 | `app.js`、`app.css`（改完 `node scripts/sync-cloud.mjs`） |
| 新資料欄位 | 直接放進 item 的 data（JSON，不用改資料表）；畫面讀寫即可 |
| 新的資料操作（新 API 路徑） | `store.js` 的 `call()`、`cloud/src/index.ts` 的 `api()`，兩邊回傳格式一致 |
| 影片／檔案相關 | adapter 的 `putMedia`、`mediaUrl`、`downloadMedia` |
| AI 任務 | 依 `site-ai-prompts` 技能 |

資料模型（不要破壞）：`items` 每筆有 `id`、`kind`（`content` 或 `event`）、`createdAt`、`updatedAt`，其餘欄位自由。內容卡常用欄位：`title cat status media link note plats scheduleAt captions srt edited`。活動常用欄位：`name type date time place contact role status steps notes confirm`。

## 3. 實作守則
- 畫面一律用 `esc()` 放入使用者或 AI 給的字；連結用 `safeUrl()`。
- 新按鈕走 `data-act` 事件委派，不要在 HTML 寫 `onclick`。
- 改資料用 `patch(id, data, { note })` 讓使用者看到「已儲存」。
- 刪除或無法復原的動作一定用 `confirmBox()`，標題寫出要刪的東西名稱。
- 表單錯誤用 `fieldError(欄位, 訊息)`，不要只跳 toast。
- 照 `site-ui` 技能的規則做版面與文字。

## 4. 測試與交付
- 依 `site-test` 技能：`npm test` 必須全過；新功能在 `tests/smoke.mjs` 加至少一條測試。
- 動到雲端後端：`cd cloud && npx wrangler types && npx tsc --noEmit`。
- 更新 `CHANGELOG.md`（未發佈區段）。
- PR 標題與說明用繁中：改了什麼、使用者看到的差別、怎麼測的、有沒有需要使用者做的設定。
