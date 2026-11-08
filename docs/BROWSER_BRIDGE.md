# Flow HeptaBase Link Bridge 1.1.1

這版使用已核准的 Windows 本機橋接。舊版 1.0.2 在目前 Edge 持續回報沒有註冊處理程式；1.1.0 改由 Native Messaging 只傳送合法卡片 ID，直接啟動既有 win.7，不依賴瀏覽器辨識 `flowhepta`。程式、CLI 及真正瀏覽器的驗證分開記錄，不能只因 host 回覆 accepted 就宣稱卡片已顯示。

1.1.1 新增預設開啟的自動關頁：host 接受開卡請求後，只關閉原本仍在 handoff URL 的頂層分頁；失敗時保留錯誤與重試。可在橋接設定取消「送出開卡請求後，自動關閉中繼頁」。不新增權限，不改桌面程式。這是使用者對舊規格不自動關頁的明確修訂。

## 更新

1. 既有使用者沿用 Repo 的 `build/browser-extension`；從整合包使用者載入包內 `browser-extension`。資料夾改變可能改變插件 ID，需使用新的實際 ID 安裝 host。
2. 先安裝本機 host，指令與範圍見 [NATIVE_MESSAGING.md](NATIVE_MESSAGING.md)（Repo）；整合包內的根目錄 README 包含同樣步驟。Host 只註冊於目前帳號，且只允許指定插件。
3. 到 Edge 擴充功能管理頁重新載入 **Flow HeptaBase Link Bridge**，必要時確認新增的本機橋接權限並重新啟用。已開的設定頁也有「重新載入橋接」。選項保留。
4. 重開原卡片 HTTPS 連結；設定頁／未關閉的中繼頁應是「頁面 1.1.1 · 已載入 1.1.1」。舊頁面不會自動換成新程式，成功時中繼頁會依設定消失。

平台工具禁止 Agent 讀取／操作擴充功能管理頁及 extension scheme 頁面，因此重載／權限步驟由使用者完成；不換用其他介面繞過。正常 win.7 已在執行，本次不需要再 Quit 桌面程式。

## 開啟與備援

只有精確 `app.heptabase.com/<space-uuid>/card/<card-uuid>?flowhepta=1` 的頂層連結預設進橋接；未標記連結與其他網站維持網頁。自動開啟仍等待頁面可見且有焦點，僅嘗試一次。手動按鈕走受限的本機橋接，重複的待完成請求會合併，完成後可自行再開一個新卡片窗。

「改用 Heptabase 網頁版」會停止此頁後續自動嘗試，並略過該分頁／卡片的橋接 30 秒，避免迴圈。另保留明確的「改用 Windows 協定連結」；它維持原生連結與瀏覽器確認，並不宣稱已解決目前 Edge 的舊協定錯誤。

本機橋接失敗／缺失時顯示原因並保留分頁、重試和網頁備援。8 秒未回覆會結束等待；晚到結果不會覆寫使用者已選的網頁／協定狀態或關閉已離開 handoff 的 tab。Host 只回報程序啟動，頁面不能驗證卡片內容已載入；自動關頁採用的是 host 接受請求，卡片讀取錯誤仍由桌面視窗顯示。若瀏覽器拒絕關頁，保留頁面並提供手動關閉提示，不重複開卡。不保存卡片內容、原始錯誤 URL 或診斷紀錄。

## Discord 與驗收

Bot 不在此 Repo，最小修改仍是在產生 HTTPS 網址的位置套用 `markHeptaCardUrl`。範例見 Repo 的 `integrations/discord/README.md`；沒有修改或部署外部 Bot，也沒有代發測試訊息。無法修改 Bot 時可自行開啟「攔截所有合法卡片」，預設 OFF，會同時影響一般瀏覽器。

77 項 JavaScript 測試通過，其中 30 項涵蓋橋接／launcher／設定，包含關頁的成功、拒絕、timeout、取消、設定及 sender/tab 範圍。前輪另有 6 組原生 host EXE 與實際雙登錄安裝／遷移／升級／回退／移除通過。Google Chrome fallback key 修正後，使用者已確認實際 Discord 開卡可用；1.1.1 由使用者重新載入並從 Discord 點擊，確認新卡片顯示、中繼頁消失，Agent 亦獨立核對 native window 與 tab metadata。失敗保留的負向案例是 API/DOM 測試，沒有宣稱已停用正常 host 做實機負向驗收。詳見 Repo 的 `docs/DEEPLINK_TEST_RESULTS.md`。

## 回退與交付

停用插件即可回到一般網頁。需要前版可載入保留的 1.0.2 ZIP；移除本機 host 的步驟在 Native Messaging 指南，保留桌面程式與所有筆記資料。既有 win.7 桌面 ZIP／runtime 不會被這個更新覆寫。

開發：`npm test`、`npm run build:extension`、`npm run test:native-host`。來源：[Edge Native Messaging](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/native-messaging)。
