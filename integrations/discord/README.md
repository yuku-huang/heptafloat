# Discord Bot 最小修改方案（尚未部署）

目前 Repository 沒有 Discord Bot。這份文件是外部 Bot Repo 的修改範例，沒有讀取 Bot token、傳送訊息或部署。

橋接 1.1.1 的既有 Discord 連結開卡／自動關閉中繼頁已由使用者實測通過；這不表示 Bot 已加入 marker。是否處理未標記連結取決於使用者既有的 intercept-all 選項，預設仍為 OFF。Bot 修改仍須在實際 Bot Repo 另行套用以下最小 helper。

2026-11-08 實際 Discord Desktop 的現有 Bot 訊息使用未標記 HTTPS；點擊文字卡片連結後，Edge 開啟對應網頁，符合預設。這些舊訊息不會因擴充功能更新就變成標記連結，也不能據此宣稱 Bot 已整合。

1. 先在目標瀏覽器停用橋接，確認 Bot 原有 Heptabase 卡片網址加上 `flowhepta=1` 後，仍能開到原卡片。登入／手機版相容性要由各裝置驗證。
2. 將本 Repo 的 `shared/hepta-links.cjs` 複製到 Bot 的 utilities 目錄（沒有套件依賴），只修改「產生 URL」的那一處：

```js
const { markHeptaCardUrl } = require('./utils/hepta-links.cjs');

// 在既有權限檢查和卡片網址產生流程之後：
const cardUrl = markHeptaCardUrl(originalHttpsUrl);
// 沿用既有 Discord 訊息／Link Button，將 URL 欄位改成 cardUrl。
// 不要把 flowhepta:// 當成 Discord Button URL。
```

實際差異應相當於：

```diff
- button.setURL(originalHttpsUrl);
+ button.setURL(markHeptaCardUrl(originalHttpsUrl));
```

函式使用 `new URL()`／`searchParams.set`，檢查精確 HTTPS host、UUID、卡片路徑；保留其他 query/hash。無效網址會拋出錯誤，呼叫端應沿用既有錯誤處理，不能改成任意轉址。重複套用不會加入兩個 marker。

若 Bot 使用文字訊息的 Markdown 連結，而不是 Link Button，可重用本資料夾的 `card-link.cjs`（移入 Bot 時調整其 shared module 相對位置）：

```js
const { discordCardLink } = require('./integrations/discord/card-link.cjs');
const cardLink = discordCardLink(cardTitle, originalHttpsUrl);
// 將 cardLink 放回既有訊息欄位，沿用原權限、allowed-mentions 與發送流程。
// 輸出形式：[卡片名稱](<https://app.heptabase.com/.../card/...?flowhepta=1>)
```

此 helper 會跳脫標題的 Markdown 控制字元，以明確邊界保護 HTTPS 目的地；只轉換當次 Bot 自己產生的卡片欄位，不掃描或改寫既有使用者訊息。純函式測試不能代替真正 Bot／Discord Markdown／行動版驗收。實際 Bot 不在 Repo，沒有假定它使用 JavaScript、特定 library 或特定檔案路徑；其他語言應在同一 URL 產生位置做等價最小修補。

建議先用測試頻道的兩張非敏感卡片，檢查 Discord Desktop → Windows 預設瀏覽器 → 小視窗，及未裝擴充功能／Android／iOS 的原始網頁行為。不要在未驗證手機或登入 routing 時全面改寫既有訊息。

Bot 無法修改時，可在擴充功能設定手動開啟「攔截所有合法 Heptabase 卡片連結」，預設 OFF。它會影響一般瀏覽器中的卡片連結；不能可靠辨識是不是 Discord 來源。網頁備援會暫時略過該分頁／卡片，避免重複橋接。
