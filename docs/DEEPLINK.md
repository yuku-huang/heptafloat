# Windows 卡片連結預覽與 Discord 橋接

橋接 1.0.2 獨立更新：見 [BROWSER_BRIDGE.md](BROWSER_BRIDGE.md)，手動按鈕恢復原生協定連結。`npm run package:extension` 不改寫既有 win.7 桌面產物。正常 win.7 已啟用並觀察到獨立 OS 開卡；瀏覽器／Discord 程式啟動仍未驗收。更新檔案不代表已載入版本更新。

此功能沿用 HeptaFloat（Flow HeptaBase）的 Electron host、官方 Heptabase CLI 與卡片 renderer。win.7 依使用者最新要求，每個連結預設開新的完整卡片窗，包含編輯、自動儲存、搜尋、歷史、語言上色與獨立置頂；這覆寫原附檔的唯讀／單窗重用設計。瀏覽器橋接目前是實驗功能：Edge 的 HTTPS→中繼頁已觀察到，外部程式啟動尚未通過實機驗收，不能當成已完成 Discord 端到端整合。詳見 [實測紀錄](DEEPLINK_TEST_RESULTS.md)。

## 安裝桌面協定

Windows 10/11 x64；先保留原本資料，從系統匣正常退出舊版。Heptabase 必須執行中，且 CLI 已啟用。此版未簽章，不會安裝服務或要求管理員權限。

從 Repo：

```powershell
npm ci
npm run package:windows
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1 -Action Install -SourceDirectory .\dist\0.9.12-win.7\HeptaFloat-win32-x64
```

從解壓縮的完整 distribution 資料夾：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1 -Action Install
```

會複製到 `%LOCALAPPDATA%\Programs\HeptaFloat\<version>`，並透過 Electron `setAsDefaultProtocolClient` 註冊目前使用者的 `flowhepta`。原先同名協定會先備份；HTTP、HTTPS、heptabase 和預設瀏覽器不變。直接啟動 portable EXE 不會自行註冊／搶走關聯。

狀態與回退（從 Repo 或 distribution 執行相同腳本）：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1 -Action Status
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1 -Action Rollback
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1 -Action Uninstall
```

有兩個受管理版本時，Rollback 將協定指回前一版；只有一版時恢復安裝前的關聯並保留程式檔。Uninstall 先要求該安裝目錄的程式已退出，再移除 receipt 記錄的版本資料夾並恢復原關聯；保留使用者設定／recovery 與所有 Heptabase 卡片。若協定已被其他 App 改走，腳本會停止，不覆蓋它。不要手動刪掉仍被 handler 指向的版本目錄。

## 連結格式與使用

```text
https://app.heptabase.com/<space-uuid>/card/<card-uuid>?flowhepta=1
                         ↓
flowhepta://card/<card-uuid>?space=<space-uuid>
```

每次合法連結都開啟新的 720×540 可調大小卡片窗；重複點同一張卡也開新窗，同時保留同一個 App 主實例。啟動前收到的連結會排隊，不再採跨卡片的最後一筆覆蓋。窗內搜尋／歷史仍在該窗切換。置頂按鈕及 Ctrl+Shift+P 只改目前視窗；新窗沿用主視窗的預設置頂值。主日記不被切換。開啟本身不寫卡片，只有使用者編輯才依既有 MD5 保護儲存。

所有卡片窗使用原本工具列、設定與完整編輯器。主題／字級／全域快捷鍵／啟動偏好共享，置頂、編輯緩衝、歷史與復原草稿按視窗隔離。Esc 隱藏後，可從系統匣 Open card windows 找回；關閉會先儲存，未存妥或正在組字時保留視窗。Quit 檢查所有窗。同卡衝突沿用保留雙版本的副本流程。初始載入失敗時仍提供重試及網頁備援；目前只支援官方 CLI 可讀的 note 文字卡片，其他媒體／無權限／未連線時會顯示錯誤與備援。`spaceId` 用於連結驗證及 canonical URL；資料仍來自目前已登入的官方桌面 CLI，沒有增加跨帳號登入或切換空間 API。

只接受精確 `app.heptabase.com` HTTPS 卡片路徑與 UUID。網站載入後自行產生的 `/tab/...` 等額外路徑目前不屬於這個 parser 的輸入格式；Bot 應沿用已驗證的分享卡片網址。query/hash 不直接進 shell；App 的備援網址一律由驗證後 IDs 重建，不含原始 tracking／marker。

手動 Windows 測試（使用自己的兩張合法文字卡片）：

```powershell
Start-Process 'flowhepta://card/<card-uuid>?space=<space-uuid>'
```

開發版需先 `npm run build:windows`，再明確註冊 `node scripts/run-windows.cjs --register-protocol`。它會指向 Electron.exe 和 `build/windows` 入口；測完務必重新執行安裝腳本或已安裝 EXE 的 `--register-protocol` 恢復正式路徑，避免依賴臨時 build。不要把開發模式結果當成安裝版結果。

## 載入 Chrome／Edge 擴充功能

```powershell
npm run build:extension
```

1. 確認 Windows 預設 HTTPS 瀏覽器。本機實測為 Edge。
2. 在該瀏覽器手動開啟 `edge://extensions` 或 `chrome://extensions`。
3. 開啟「開發人員模式」，按「載入解壓縮」，選取 `build\browser-extension`，或 distribution 內的 `browser-extension`。
4. 資料夾選擇視窗只顯示子資料夾，裡面看似空白是正常的；直接按「選擇資料夾」，不用找 ZIP 或選 manifest。
5. 確認管理頁出現 **Flow HeptaBase Link Bridge** 且開關啟用。更動 source 後需重新 build 並在管理頁重新載入；設定頁也提供「重新載入橋接」，保留選項。中繼頁的頁面／已載入版本都應為 1.0.2。未加入自動熱更新；平台禁止工具操作 internal extension pages，這次不能代按或宣稱已重新載入。

不會自動發布到商店、修改瀏覽器政策、安裝 Native Messaging 或改全域 HTTP(S) handler。只有 `webNavigation`、`storage` 及該 HTTPS host 權限，沒有 `<all_urls>`／內容擷取／外部訊息入口。

預設只處理 `flowhepta=1` 的合法頂層卡片導覽；一般卡片、iframe、其他網站照常。背景程式先轉到自己的中繼頁，保留「以 Flow HeptaBase 開啟」及「改用 Heptabase 網頁版」。頁面可見且有焦點後才自動嘗試一次；手動按鈕直接使用原生協定連結，不以 API 攔截左鍵。選擇手動或網頁會取消後續自動嘗試／過期狀態。Promise 成功不等於 App 已開；錯誤會顯示並遮罩 URL／UUID。瀏覽器仍可拒絕或顯示確認，不會繞過安全提示。

點擴充功能圖示可進設定：

- 「嘗試自動開啟」預設 ON；OFF 時停在選擇頁。
- 「攔截所有合法卡片」預設 OFF。Bot 不能修改時才考慮開啟；它也影響一般瀏覽器連結，無法識別 Discord Desktop 來源。
- 網頁備援使用 canonical HTTPS；該分頁／卡片在 30 秒內略過橋接，避免 all-card 模式無限迴圈。暫存只在 extension session，關閉分頁移除；偏好只存 local storage，不同步外部服務。

停用／移除擴充功能即恢復原本網頁流程，不需改動卡片。沒有桌面 handler 時仍保留網頁備援；目前尚未在卸載 handler 的真實瀏覽器中驗證提示行為。

## Discord Bot

Bot 不在這個 Repo，沒有部署。外部 Bot 的最小修補見 [integrations/discord/README.md](../integrations/discord/README.md)：只將既有 HTTPS URL 經過 `markHeptaCardUrl`，保留其他 query/hash；Link Button 仍使用 HTTPS。

測試訊息與卡片權限應沿用 Bot 的既有控管。未驗證手機版前不要全面改寫訊息。未安裝擴充功能仍能到 Heptabase 登入／開啟選擇頁；本輪已確認未標記 Discord 文字連結到達 Edge 同卡網頁。Android/iOS、標記 Discord→App 仍需實測，不以網頁到達代替完整驗收。Markdown 文字連結的最小 helper 也在 `integrations/discord`，沒有部署外部 Bot。

## 重現測試與來源

```powershell
npm test
npm run test:windows
npm run test:preview
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-protocol-install.ps1 -SourceDirectory .\dist\0.9.12-win.6\HeptaFloat-win32-x64 -UpgradeDirectory .\dist\0.9.12-win.7\HeptaFloat-win32-x64
```

也可依序執行 `node scripts/package-windows.mjs --stage-only`、打包 EXE 的 smoke tests，再以 `--archive-only` 更新說明文件並建立 ZIP。不要在封裝重建來源時同時安裝。

最後一個測試只使用 `build/protocol-installs` 的任務副本，會短暫改 HKCU flowhepta，finally 恢復原 handler；不可與瀏覽器點擊 QA 同時執行。它不會終止使用者程式或寫入真實卡片。真實啟動／最小化／重複卡片／Discord／首次提示要另行觀察。

實作依據：[Electron Deep Links](https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app)、[Electron app API](https://www.electronjs.org/docs/latest/api/app)、[Chrome webNavigation](https://developer.chrome.com/docs/extensions/reference/api/webNavigation)、[tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs)、[storage](https://developer.chrome.com/docs/extensions/reference/api/storage)。沒有採用 localhost server、公開轉址站或非公開 Heptabase API。
