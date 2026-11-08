# P2 提案：Edge Native Messaging 開卡

狀態：**使用者已明確核准「依提案開發、安裝並實測」；P2 已實作／安裝，1.1.1 的 Discord 開卡與中繼頁自動關閉亦已由使用者實測通過。** 以下保留原提案及驗證目標；現行操作見 [NATIVE_MESSAGING.md](NATIVE_MESSAGING.md)，已通過／失敗項目見 [DEEPLINK_TEST_RESULTS.md](DEEPLINK_TEST_RESULTS.md)。實作差異：受控對照確認這台 Edge 需要官方 Google Chrome fallback key，因此安裝同步管理兩個 HKCU keys，仍只有同一份 host／manifest／單一 origin，並拒絕接管未知 key；沒有新增 Chrome 插件或宣稱 Chrome 已實測。自動關頁依使用者後續明確要求，覆寫原先不自動關頁設計。

## 已知證據與限制

1. 使用者截圖確認橋接 1.0.2、原生按鈕及點擊處理正常；Console 回報 `scheme does not have a registered handler`。
2. 同張卡片透過獨立 Windows URI 冷啟動可建立正確 win.7 視窗，官方 CLI 可讀內容，MD5 比對未變。這不是瀏覽器成功。
3. 目前帳號的 HKCR/HKCU、32 位元檢視與 Windows association API 均能找到 win.7。Edge 和診斷程序同帳號、非提高權限、無套件身分；未確認為登錄檔缺值。
4. 重新註冊、Windows 關聯變更通知及 Edge 完整重啟後，使用者仍看到相同錯誤；主 PID 已換新，沒有新卡片窗。這不代表所有 Chrome/Edge 都不能用協定，也不證明某項安全機制是根因。

## 最小變更與權限

- 在現有橋接新增 `nativeMessaging` 權限，保留精確 Heptabase host 範圍；以 Native Messaging 優先傳遞已驗證的 space/card UUID，保留現有協定與網頁備援。
- 新增一個小型 Windows host EXE，使用既有 .NET Framework 標準函式庫與本機 C# 編譯器建置，不新增 Python/Node runtime、網路監聽或常駐服務。核准後已完成 host 1.0.0 建置及 framing／安裝測試。
- 預設僅註冊目前使用者的 Edge host：`HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.heptafloat.bridge`。Manifest `allowed_origins` 只允許實際安裝的 Flow HeptaBase Link Bridge ID。Chrome 是另一個需獨立安裝／驗證的選項，不預先註冊。
- Host 只接受固定 `openCard` 動作及兩個 UUID（可附 request ID），限制訊息大小，拒絕額外命令／路徑／URL。讀取受管理安裝資訊，只能直接啟動該安裝中的 `HeptaFloat.exe`；不使用 shell、不接受任意執行檔。
- 將 canonical URI 作為既有 EXE 的固定參數，重用現有單一實例與完整卡片窗，不依賴瀏覽器識別 `flowhepta` 的註冊。現有 win.7 應可直接沿用，但仍需實測。
- Host/child 的標準輸入輸出隔離，訊息使用原生協定 framing；不把 child log 混入 JSON。只回報驗證／啟動是否完成，不把程序啟動當成卡片載入成功。
- 不讀卡片內容、不持有 Heptabase 憑證、不更改瀏覽器安全政策或 HTTP(S) 預設、不部署 Bot／代發訊息。

## 維運與回退成本

- 需隨橋接交付 host EXE、manifest 和可重跑的安裝／移除腳本；host 路徑或 extension ID 改變時必須更新註冊。
- 新增權限可能要求使用者確認／重新啟用擴充功能；現有工具仍不能代操作內部管理頁。未簽章 EXE 的首次執行結果需實測，不能代繞安全提示。
- 移除時只刪本方案 receipt 擁有的 host 註冊／檔案，保留 HeptaFloat、協定、設定、recovery 與卡片資料。實作比原提案更保守：未知的同名 host 直接拒絕覆寫，無需接管／恢復外部安裝。停用橋接仍可開一般 HTTPS。
- 不估稱已部署或已可用；只有驗收完成後才納入正式開啟路徑。

## 核准後的驗證

1. 純函式／host 測試：framing、長度、JSON、UUID、origin、未知動作、路徑逸出、受管理 EXE 缺失、child output 隔離；全用測試資料。
2. 真正 Windows host 安裝／重裝／升級／回退／移除，確認原有主程序、其他關聯與私人資料保留。
3. 開發模式與已安裝 win.7 分開測試：冷啟動、已啟動、最小化、A/B/重複 A、新窗、置頂及前景。程序成功不當成 UI 成功。
4. 由使用者載入更新後的 Edge 橋接，實測 HTTPS→host→指定卡片；再測真實 Discord 既有連結、未標記連結、停用／缺 host 的網頁備援。Chrome/手機不沿用 Edge 結果。
5. 更新文件與 Git，明列實際通過與未通過；Bot 不在此 Repo，仍只交付外部最小修改方案。

依原需求文件 P2，先提出代價與驗證方案，再取得本次使用者的明確確認才開始實作／安裝。核准的是受限的目前帳號橋接；不包含任意執行命令、擴大其他插件權限、網路服務、瀏覽器政策修改或 Bot 部署。

參考：[Chrome Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)、[Edge Native Messaging](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/native-messaging)。
