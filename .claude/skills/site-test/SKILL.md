---
name: site-test
description: 驗證個人IP運營中控台的改動：自動測試、雲端版檢查、手動與截圖檢查。任何改動完成前、或要補測試時使用。
---

# 測試與驗證

## 自動測試（一定要跑）
```bash
npm install                                  # 第一次
npx playwright install chromium              # 第一次，或用 CHROME_PATH 指向已安裝的 Chrome
npm test                                     # 同步檢查＋語法檢查＋瀏覽器全流程
```
`tests/smoke.mjs` 用真的瀏覽器打開 `index.html`，走過：設定、欄位錯誤、上傳與播放、改狀態、搜尋、活動與六步檢查、備份匯出匯入、手機寬度與按鈕大小、刪除確認。任何一項 ✗ 都不能交付。

## 雲端版
```bash
cd cloud
npm install
npx wrangler types && npx tsc --noEmit       # 型別檢查
npm run dev                                  # 本機跑雲端版（http://localhost:8787）
```
手動走一遍：設定密碼 → 上傳影片並播放 → 匯出備份 → 匯入備份 → 刪除 → 登出再登入。

## 新功能要補測試
- 在 `tests/smoke.mjs` 加一段，用 `ok(條件, '白話描述')`。描述寫「使用者看得到的結果」，例如「刪除前跳出確認，寫明要刪哪一支」。
- 測試資料用中性範例，不放真實人名。

## 畫面改動要看截圖
- 手機 375×812、桌機 1280×900，淺色與深色各一張。
- 看：有沒有字被切掉、元件重疊、空白太大、深色模式看不清楚。
