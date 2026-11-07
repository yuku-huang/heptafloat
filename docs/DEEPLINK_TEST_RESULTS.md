# Deep Link 驗證紀錄（2026-11-08，Asia/Taipei）

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
