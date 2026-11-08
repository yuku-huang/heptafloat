# Flow HeptaBase Link Bridge 1.0.2

此版搭配已安裝的 HeptaFloat win.7。橋接可獨立更新；既有 win.7 Windows ZIP 仍內附橋接 1.0.0，並未改寫已測過的桌面產物。橋接更新包是 `FlowHeptaBase-Link-Bridge-1.0.2.zip`。

## 更新與重新載入

1. 已從本 Repo 載入者，沿用 `build/browser-extension`；檔案已建置更新。從 ZIP 使用者，先解壓縮，再選內含 `FlowHeptaBase-Link-Bridge` 資料夾。
2. 到 Edge／Chrome 的擴充功能管理頁，對 **Flow HeptaBase Link Bridge** 按「重新載入」。已載入的是本 Repo 的新設定頁時，也可點擴充功能圖示進設定，按「重新載入橋接」。選項會保留。
3. 重開原卡片連結。中繼頁最下方應顯示「頁面 1.0.2 · 已載入 1.0.2」；有舊版提示時，代表檔案已更新而瀏覽器尚未重新載入。既有舊中繼頁不會自動更新。
4. 若仍在使用舊版桌面程式，從系統匣正常 **Quit HeptaFloat** 後再使用 win.7；只關閉視窗不會退出。2026-11-08 晚間已確認正常帳號 win.7 在執行，本次只更新橋接時不需再次退出 App。

平台目前禁止 Agent 讀取／操作 `chrome-extension://` 和擴充功能管理頁，亦禁止換用其他介面繞過；因此這次重新載入／首次確認必須由使用者操作。檔案建置成功不代表已載入版本已更新。未修改瀏覽器安全設定、政策、profile 或 HTTP(S) 預設程式。

## 開啟行為

只有精確 `app.heptabase.com/<space-uuid>/card/<card-uuid>?flowhepta=1` 的頂層連結預設交給桌面程式。未標記的卡片及其他網頁維持原本網頁流程。

自動嘗試會等到中繼頁可見且有焦點，僅嘗試一次；在背景開啟時不會提前消耗請求。瀏覽器可能顯示「開啟 HeptaFloat」確認。手動「以 Flow HeptaBase 開啟」直接使用原生 `flowhepta://` 連結，不再以 `preventDefault()` 攔截左鍵後改呼叫 `tabs.update`。手動點擊會取消尚未完成的自動狀態與後續自動嘗試，保留瀏覽器的原生確認流程；仍由瀏覽器決定是否允許。頁面無法確認 App 是否已收到，狀態文字不當作開啟成功。

「改用 Heptabase 網頁版」會取消此頁後續的自動嘗試，並略過該分頁／卡片的橋接 30 秒，避免迴圈。失敗時保留手動重試；錯誤原因會遮罩完整網址及卡片 UUID，不保存卡片內容或診斷紀錄。

## Discord 連結

現有 Discord Bot 的一般 HTTPS 卡片連結不帶標記時，開網頁是預設行為。Bot 不在此 Repo；最小修改是**在產生卡片網址的地方**套用 `markHeptaCardUrl`，訊息及 Link Button 仍使用 HTTPS。範例見 `integrations/discord/README.md`；沒有修改或部署外部 Bot，也沒有代發測試訊息。

無法修改 Bot 時，可自行開啟設定的「攔截所有合法卡片」，預設 OFF；它同時影響一般瀏覽器，不能可靠地只識別 Discord Desktop。關閉／移除擴充功能就回到原本網頁流程。

## 實測界線與回退

66 項單元測試通過，其中橋接啟動使用 API／DOM doubles，並非真實瀏覽器確認。回歸測試先重現 1.0.1 左鍵被取消，再確認 1.0.2 保留原生連結，包含載入早期、API 失敗與延遲結果。使用者已確認 1.0.2 頁面／已載入版本，按鈕會出現瀏覽器提示，但仍未看到卡片；比對前後也沒有新卡片窗，所以 **1.0.2 App 喚起仍未通過**。正常 win.7 的獨立 OS 協定開卡與完整工具列不算瀏覽器成功。Discord 到中繼頁由使用者確認，標記 A/B 仍待驗收。詳細紀錄以 Repo 的 `docs/DEEPLINK_TEST_RESULTS.md` 為準。

## 唯讀啟動觀察

可在 Repo 根目錄執行：

```powershell
.\scripts\observe-protocol-launch.ps1 -Seconds 60 -ReportPath .\build\link-observation-01.json
```

看到 `READY` 後，才在中繼頁點擊並確認瀏覽器提示。腳本只記錄新 HeptaFloat PID、父程序名稱、命令列是否可讀／是否帶協定參數及 helper 分類，不記錄完整網址或卡片內容；不變更協定、關閉程序或要求管理員權限。報告不能覆寫，重跑請改檔名。輪詢可能漏掉很快退出的程序；沒有觀察到新程序不等於證明 Windows 從未嘗試啟動，也不代表 App 已收到。這是背景診斷，不會持續移動游標。

可停用橋接保留一般網頁功能；要回到 1.0.1，解壓縮前版獨立 ZIP 並載入內含資料夾；回到 1.0.0 可使用先前 win.7 distribution 內的 `browser-extension`。這不更動 Heptabase 卡片或桌面設定。桌面協定回退依 Repo 的 `docs/DEEPLINK.md` 安裝腳本執行。

開發：`npm test`、`npm run build:extension`。Windows 獨立封裝：`npm run package:extension`；產物與 SHA-256 在 `dist/`，不提交 Git。

參考：[Chrome runtime.reload](https://developer.chrome.com/docs/extensions/reference/api/runtime#method-reload)、[擴充功能更新與重新載入](https://developer.chrome.com/docs/extensions/get-started/tutorial/debug)、[Chromium 外部協定處理](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/browser/external_protocol/external_protocol_handler.cc)。前景等待是本橋接的保守策略，未宣稱已證明它是本機先前失敗的唯一原因。
