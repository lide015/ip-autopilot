---
name: site-review
description: 審查個人IP運營中控台的 PR：正確性、兩個版本是否一致、安全、介面體驗。被要求 review、或自己開 PR 前做最後檢查時使用。
---

# PR 審查

逐項檢查，回報時用繁中，每個問題寫：在哪裡、會發生什麼事、建議怎麼改。沒問題的項目不用列。

## 一致性
- [ ] `app.js`／`app.css` 與 `cloud/public/` 同步（`node scripts/sync-cloud.mjs --check`）。
- [ ] 新的資料操作兩個 adapter 都有，回傳格式相同。
- [ ] AI `TASKS` 三處一致（見 `site-ai-prompts`）。

## 安全
- [ ] 使用者、AI、資料庫來的字都有經過 `esc()`；連結經過 `safeUrl()`。
- [ ] 沒有把金鑰寫進程式、log、備份檔或錯誤訊息。
- [ ] 雲端版新 API：要登入（在 `isAuthed` 之後）、寫入請求檢查 `x-app` 標頭、輸入有驗證與長度限制。
- [ ] 沒有新的外部網域請求（除了使用者自己設定的 AI 服務與 Google Fonts）。

## 介面體驗
- [ ] 符合 `site-ui` 檢查表（44px、深色模式、空狀態、錯誤訊息位置、刪除確認）。
- [ ] 文字是白話繁中、動詞開頭、沒有工程術語。
- [ ] 沒有放任何真實個人資料。

## 測試
- [ ] `npm test` 通過；新功能有對應測試；雲端改動有型別檢查。
- [ ] `CHANGELOG.md` 有更新。
