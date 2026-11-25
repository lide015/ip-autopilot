---
name: site-release
description: 發佈個人IP運營中控台的新版本：整理更新紀錄、調版號、打包給買家。使用者說「發佈」「出新版」「打包」時使用。
---

# 發佈新版本

1. 確認 `main` 上 `npm test` 與雲端型別檢查都通過。
2. 決定版號（`package.json` 的 `version`）：只修問題 → 第三碼＋1；新功能 → 第二碼＋1；資料格式不相容 → 第一碼＋1（要在更新紀錄寫搬家方法）。
3. `CHANGELOG.md`：把「未發佈」改成版號與日期，用使用者看得懂的話寫（「新增：影片卡可以搜尋」，不要寫函式名稱）。
4. 同步雲端版：`node scripts/sync-cloud.mjs`，`cloud/package.json` 版號一起改。
5. 打包給買家（不含開發用檔案）：
   ```bash
   zip -r ip-autopilot-vX.Y.Z.zip index.html app.js app.css store.js README.md CHANGELOG.md cloud -x "cloud/node_modules/*" "cloud/.wrangler/*" "cloud/worker-configuration.d.ts"
   ```
6. 開 PR 或直接在 GitHub 建 Release，附上 zip 與更新重點。
