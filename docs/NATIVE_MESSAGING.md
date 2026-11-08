# Windows 本機橋接：1.1.0

使用者已明確核准原規格的 P2：新增 `nativeMessaging` 權限、開發／安裝只允許此插件開卡的本機橋接。既有 win.7 不需更新；新窗、置頂、編輯及儲存仍使用原本桌面程式。此階段已完成程式與安裝測試，真正 Edge／Discord 驗收另記於 [實測紀錄](DEEPLINK_TEST_RESULTS.md)，不能以 CLI probe 代替。

## 安裝與更新

先使用既有桌面安裝腳本安裝 HeptaFloat win.7，讓 `%LOCALAPPDATA%\Programs\HeptaFloat\install-state.json` 有受管理安裝紀錄。Portable EXE 本身不會建立這份紀錄。

從 Repo：

```powershell
npm run test:native-host
npm run build:extension
powershell.exe -NoProfile -File .\scripts\install-native-host.ps1 -Action Install -ExtensionId '你的32字元擴充功能ID'
```

目前使用者的 host 已由 Agent 安裝；更新插件時沿用 `build/browser-extension`，避免換資料夾造成 ID 改變。從整合包使用者，載入包內 `browser-extension` 資料夾，從管理頁複製實際 ID，再執行包內相同安裝腳本。無需另外安裝 Node/Python 來執行已編譯 host；從原始碼建置才需要現有 C# 編譯器。

從 Repo 製作整合包：`npm run package:native-bridge`。它只複製已測的 `build/native-host/1.0.0`，不重新編譯。輸出 `dist/FlowHeptaBase-Native-Bridge-1.1.0-windows-x64.zip`，內含插件、host、目前帳號安裝腳本與操作／驗收文件；不包含本機 receipt、允許 origin 設定或任何私人卡片資料。解壓縮後在該包根目錄執行 `powershell.exe -NoProfile -File .\scripts\install-native-host.ps1 -Action Install -ExtensionId '你的32字元擴充功能ID'`。

在 Edge 擴充功能管理頁重新載入 **Flow HeptaBase Link Bridge**；新增權限若使它停用，需要自行確認並啟用。重開卡片 HTTPS 連結後，頁底應是「頁面 1.1.0 · 已載入 1.1.0」。平台禁止 Agent 操作內部擴充功能頁，這一步由使用者完成；不修改瀏覽器安全設定。

## 範圍與狀態

- 預設只處理有 `flowhepta=1` 的合法卡片 HTTPS；未標記連結維持網頁。所有卡片攔截仍為可選、預設關閉，不能只辨識 Discord Desktop。
- 本機 host 1.0.0 安裝於目前帳號的 `Programs\HeptaFloatNativeBridge\Edge\1.0.0`；HKCU NativeMessagingHosts 的單一 manifest 只允許這個插件的實際 ID。Chrome 須另行指定與實測，預設不註冊。
- Host 只接受 `openCard`、UUID 與可選 request ID，限制 8 KB，拒絕未知命令／欄位、非允許 origin、UNC/device/reparse 路徑及不符受管理 receipt 的 EXE。它不讀卡片內容或憑證。
- Host 直接呼叫現有 HeptaFloat，避開目前 Edge 無法辨識自訂協定的路徑。保留原始 Windows 協定與網頁備援，不修改 HTTP(S) 預設或瀏覽器政策。
- Host `accepted:true` 只代表已驗證並建立桌面程序，不代表卡片已載入。UI 保留此界線；仍需核對真正卡片視窗。
- 沒有網路監聽或常駐服務。子程序與 host 的標準輸入輸出隔離，不把應用程式 log 寫入 Native Messaging 資料流。

## 狀態、回退與移除

```powershell
powershell.exe -NoProfile -File .\scripts\install-native-host.ps1 -Action Status
powershell.exe -NoProfile -File .\scripts\install-native-host.ps1 -Action Rollback
powershell.exe -NoProfile -File .\scripts\install-native-host.ps1 -Action Uninstall
```

多版本回退指回前版 manifest；只有一版時解除註冊、保留版本檔案。移除只刪 receipt 擁有的版本目錄；遇到執行中的 host、其他 owner／額外登錄資料或不符預期路徑會停止。既有 HeptaFloat、設定、recovery、卡片、瀏覽器設定均保留。相較原提案，既有未知同名 host 直接拒絕覆寫，避免影響其他安裝。

停用插件即可恢復一般 HTTPS；回到 1.0.2 可載入前版 ZIP 的插件資料夾，再移除本機 host。權限可能需要瀏覽器重新確認，不代繞安全提示。

## 開發驗證

`npm test` 測橋接與共用邏輯；`npm run test:native-host` 建置並以假的桌面程式測原生 framing／來源／路徑／子程序隔離。測試不寫真實筆記。已驗證的 host binary 需凍結後再打包／安裝；不要在同版已安裝後重編譯並覆蓋它。

目前真正 Edge 已確認載入 1.1.0，主按鈕回報 `Specified native messaging host not found`。登錄、檔案、ACL 或獨立 host 成功都不能覆蓋這個失敗。`scripts/diagnose-native-host.ps1` 只讀受管理 host 的兩個 registry view／manifest／binary，輸出不含卡片內容的診斷。`scripts/probe-native-host-discovery.ps1` 可做有 ownership guard 的暫時 Chromium 備援登錄對照；本機實測仍失敗，已 Restore，不納入正式安裝路徑，也不改 Google Chrome、HKLM 或瀏覽器政策。

來源：[Edge Native Messaging](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/native-messaging)、[Chrome Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)。

手動啟動 host 查找日誌：正常完全退出 Edge，再雙擊 `scripts/edge-native-diagnostics.cmd`，在原 profile 開一次既有卡片連結，回診斷視窗按 Enter。腳本不強制結束程序、不改 policy/profile、不開 remote-debugging；完整 log 僅在忽略的 `build/edge-native-diagnostics`，分享時只用 host-filtered 摘錄。首次 guard 拒絕後，使用者已成功啟動；本機篩出的 host 日誌確認為 manifest lookup failure。這是 native-host 安裝診斷，沒有讀取或控制被工具拒絕的 extension 內頁。
