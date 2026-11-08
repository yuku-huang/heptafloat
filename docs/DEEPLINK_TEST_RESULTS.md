# Deep Link 驗證紀錄（2026-11-08，Asia/Taipei）

## 14:32：橋接 1.0.1 接續

| 項目 | 結果與界線 |
| --- | --- |
| Source／build | 橋接 1.0.1、62 單元測試通過；前景等待、立即手動 API 呼叫、選擇取消／過期結果、版本提示及重載按鈕。API／DOM doubles 不是真實提示或 App 確認 |
| 真正 Discord Desktop 點擊 | 14:25 對可見未標記文字連結實際點擊；Edge 156.0.4314.58 到達相同 card route，網站加上 `/tab/<uuid>`，沒有 Flow 卡片窗，符合預設未標記開網頁。未發送或修改訊息 |
| 標記 Edge 導覽 | 更新前 baseline 到達中繼頁 metadata，背景 probe 當時沒有新卡片窗；未混入 OS probe。這不證明已前景操作新版中繼頁 |
| 工具限制 | `getTab` 明確拒絕：URL policy 只允許 HTTP(S)，禁止間接執行、native browser、raw CDP 或其他 surface 繞過。沒有取得中繼頁內容／console／提示，不能代按重載 |
| 新版載入／首次提示／App | 等待使用者手動重載／回報。建置 1.0.1 不等於已載入 1.0.1，尚未宣稱自動／手動成功 |
| 正常 App 狀態 | handler 是 win.7，正常 win.5 主程序仍執行，沒有強制終止。使用新版前需系統匣 Quit，僅關視窗無效 |
| Bot／Chrome／行動版 | 外部 Bot 僅提供 URL／Markdown helper，未部署或代發訊息。Chrome、標記 Discord A/B、手機仍未驗證 |

原生 AX click 沒有導覽時，先確認實際可見連結。本輪以新鮮 Discord 截圖的藍色文字座標點擊，並比對目的 tab URL，才記為成功。只記無私人 card ID／內容的結論；未編輯真實卡片。前景等待是保守修正，尚未確認為先前無反應的唯一根因。

## win.7：使用者修訂（新版驗證）

使用者明確改為完整功能卡片窗，每個連結開新窗，覆寫舊版唯讀／重用規格。50 項單元測試通過，包含同卡雙窗離線草稿與 MD5 重試隔離。開發模式原生多窗測試通過：A/B/重複 A、獨立置頂與工具列焦點快捷鍵、設定路由、共享外觀、編輯／上色儲存、搜尋／歷史／新卡、衝突副本、離線關窗保護與全窗退出檢查；正常日記不被切換。所有寫入均為 mock。

win.7 打包後 EXE 的 `--preview-smoke` 與 `--smoke-test` 皆於 04:57 通過，前者確認上述多窗行為，後者回歸既有編輯、縮排、Enter／組字、語言選單、搜尋／歷史／儲存與主窗關閉至系統匣。皆在 Windows 實際 Electron 視窗、獨立測試 profile 與 mock CLI 執行；second-instance 由 app event 模擬，不等於正式 OS 跨程序轉交。已測 ASAR SHA-256：`962ede6525960283d7df138b0f9f20e64a48286152e3176264e3450ecf1fc1b9`。原使用者舊程序保留，正常帳號新版冷啟動／真實寫入尚未驗證。瀏覽器轉交與 Discord 的限制仍未解決，不能以此處的多窗測試當成端到端成功。

Windows 實際 HKCU 的 task-owned 安裝副本已通過 win.6 安裝／同版重跑→win.7 升級→回退 win.6→移除，finally 恢復原 handler，HTTPS 預設不變，卡片寫入數為 0。正常使用者目錄亦已安裝 win.7 並註冊 handler，已安裝 ASAR 與上述測過的 runtime 相同；原 win.5 主程序仍保留執行。這是檔案／關聯升級成功，尚未代表正常帳號新版已接手：必須從系統匣選 Quit HeptaFloat，僅關閉視窗無效。

## win.5／win.6 歷史驗證

此表區分程式測試、安裝／協定、瀏覽器與 Discord。未通過項目保留，不以模擬代替實機。測試不寫真實 Heptabase 卡片；私人內容／完整卡片網址不提交 Git。

環境：Windows 11 Home 10.0.26200 x64；Electron 45.0.0；Edge 156.0.4314.58；Chrome 157.0.8103.39 已安裝但本輪未載入橋接／未完成測試。正常 HTTPS 預設為 Edge。

| 項目 | 結果與證據界線 |
| --- | --- |
| URL／安全／MV3 邏輯 | 47 單元測試通過：精確 host/UUID/route、query/hash、shell 字元、argv 掃描、marker、iframe、stale/duplicate、預設 OFF all-card、分頁備援略過、IPC sender、權限範圍 |
| 開發模式 renderer | native mock editor + preview smoke 通過；包含 A→B 重用、最小化恢復、同卡、快速切換最後一筆、close/reopen、唯讀 IPC、錯誤清除舊卡、語言上色與 IME；second-instance 是真實 app event 的模擬，不是 OS 進程轉交 |
| 安裝版 win.5 冷啟動 | 從沒有 HeptaFloat 主程序開始 `Start-Process flowhepta://...`；實際安裝路徑出現指定 A 預覽窗，原 journal 主窗未強制顯示 |
| 安裝版 win.5 已啟動／最小化 | 實際將預覽最小化，再用 OS 協定開 B；同一 window ID 從 A 改成 B 並恢復，主 PID 不變，主實例數為 1 |
| 安裝腳本 | 實際 HKCU 安裝、同版重跑、第一版 rollback、uninstall、finally 恢復 handler 與 HTTPS 預設通過。曾發現短期 helper 鎖 EXE，加入等待／相同檔案略過後重跑通過 |
| 升級／win.6 artifact | 實際 task-owned HKCU 安裝副本從 win.5 升級 win.6、rollback 回 win.5、uninstall 恢復原 handler；HTTPS 預設不變。win.6 EXE 的 `--preview-smoke` 與 `--smoke-test` 通過，含既有編輯／語言／IME 回歸。這些不等於 win.6 正常帳號的冷啟動／Discord 驗收 |
| 真實卡片內容保護 | 最後經官方 CLI 唯讀比對兩張 OS 測試卡片，與任務開始的 content MD5 相同；報告只有計數／布林值，沒有私人內容。未測真實寫入 |
| 無擴充功能＋marker | 內建瀏覽器未裝橋接，標記 URL 到達 Heptabase 登入／「Open the Heptabase app」頁；未登入，沒有驗證登入後卡片或手機 |
| Edge 載入 | 使用者親自載入 1.0.0，截圖確認啟用。工具安全政策拒絕管理頁，所以不是 Agent 自動安裝／重新載入 |
| Edge marker→中繼頁 | 標記導覽被中止並轉到 extension scheme；使用者確認看到中繼頁與開啟按鈕。工具禁止讀取 extension URL，未直接檢查該頁內容 |
| Edge 自動／手動喚起 | **未通過**：自動請求未確認啟動；使用者回報按鈕無反應。後來 A 開啟是 Agent 的獨立 Windows 協定 probe，已明確排除，不能算 Edge 成功 |
| Edge 普通連結／網頁備援 | 邏輯單元測試通過，實際已載入 extension 的瀏覽器點擊仍待驗證；不宣稱已通過 |
| Chrome | 未載入／未測試；不可沿用 Edge 結果 |
| Discord Desktop | 視窗最小化，現有工具無法取得可操作畫面；啟動請求也未恢復，沒有完成真實點擊測試，沒有傳送訊息 |
| Bot／行動裝置／重開機／Windows 10 | Bot 不在 repo，只有修改範例；Android/iOS、重開機與 Windows 10 未驗證 |

阻礙：Codex browser URL policy 只允許 HTTP(S)，拒絕 `edge://extensions` 及中繼頁的 extension URL。沒有改用 native browser 操作、CDP、profile/政策修改等方式繞過。使用者睡前交付繼續工作；在可操作介面恢復前，P1 只能標示實驗／未驗收，不能說 Discord 端到端已完成。

下一輪先取得 Edge 外部協定失敗的實際提示／console（不含卡片內容），確認 handler、前景 user gesture 與是否出現系統確認；每次只測一個來源／不同卡片，避免 Agent 的 OS probe 混入瀏覽器結果。不得為消除提示降低瀏覽器安全設定。Native Messaging 屬 P2，未做也未獲准擴增。
