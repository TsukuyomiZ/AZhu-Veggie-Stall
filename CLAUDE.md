# 阿珠菜攤 — 專案交接文件

家用賣菜訂單管理 web app,給年長家人手機操作(iOS + Android 都有,所以做成 mobile-first 網頁)。全部介面與溝通使用**繁體中文**。

## 使用者工作規則(務必遵守)

1. **不要幫使用者開 dev server**(不要用 preview_start 開 server)。驗證前先 `Get-NetTCPConnection -LocalPort 3000` 檢查他的 server 是否在跑:在跑就直接連 `http://localhost:3000` 驗證(可用 preview_start 的 `{url}` 模式開瀏覽器分頁,這只是開瀏覽器不是開 server);沒在跑就請他啟動或只做靜態檢查。
2. **大功能用多 agent 平行分工,最後留一個 code review agent** 審整合問題,由主迴圈修 MAJOR 以上的 findings。
3. 每個功能做完要**在瀏覽器實測**並回報實測結果,不要只說「改好了」。
4. 公司網路(寶成)防火牆**擋 MongoDB port 27017**,在公司連不到 Atlas;開發用內網 DB(見下)。

## 技術棧與位置

- **專案位置**:`D:\03.Highly Confidential\AZhu-Veggie-Stall`(獨立資料夾;`theChaosWorld` 裡的 `veggie-link` 是指向這裡的 junction,只為 launch.json 的 cwd 限制存在,不要動)
- Next.js 15 App Router、**JavaScript(非 TS)**、alias `@` = 專案根目錄
- 手寫 CSS 設計系統(`app/globals.css`,規範文件 `DESIGN.md` — 改 UI 前先讀它,class 都已定義好)
- MongoDB 原生 driver(`lib/mongodb.js`,連線失敗會清快取重試)
- 零額外前端依賴:不用 Tailwind、不用元件庫、圖表是手寫 SVG、PDF/圖片匯出用 Canvas

## 環境變數(.env,已 gitignore)

| Key | 說明 |
|---|---|
| `MONGODB_URI` | 開發=內網 `mongodb://admin:...@172.23.192.227:27017/testDB?authSource=admin`;正式=Atlas(`mongodb+srv://...`) |
| `MONGODB_DB_NAME` | 開發 `testDB`;正式 `AZhu-Veggie-Stall` |
| `APP_PASSWORD` | 家人共用登入密碼(開發用 `azhu1234`)。**沒設定=不啟用登入全部開放** |
| `GEMINI_API_KEY` | Google AI Studio 免費層金鑰,AI 解析訂單用 |
| `LINE_CHANNEL_SECRET` | LINE Messaging API channel secret,webhook 簽章驗證用。沒設=webhook 回 503 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE channel access token,回覆確認訊息用。沒設=只建單不回覆 |

部署在 **Vercel**(已部署過),改環境變數要 Redeploy。Atlas 白名單需 `0.0.0.0/0`。

## 資料模型(MongoDB collections)

```js
// customers
{ _id, name(必填), phone, plate(車牌,自動大寫), address, note, createdAt }
// orders — date 是「要貨日期」字串 YYYY-MM-DD(本地時區,嚴禁 toISOString)
{ _id, customerId, customerName, date, total,
  items: [{ name, qty, unit, amount, prepared }], createdAt,
  // LINE 自動收單的訂單才有以下欄位;沒有 status 欄位 = 已確認(舊單),
  // 所以查詢一律用 status: { $ne: "pending" } 而非 $eq: "confirmed"
  status: "pending"|"confirmed", source: "line", sourceText, lineEventId }
```

## 登入與權限(擋在 API 層,lib/auth.js)

- 一組共用密碼 → httpOnly cookie(HMAC of APP_PASSWORD,半年效期,換密碼=全裝置登出)
- **訪客(未登入)只能**:看今日備貨頁 = `GET /api/orders?date=`(必須帶 date)+ `PATCH /api/orders/:id`(勾備貨)
- 其他 API 全部 401;頁面用 `components/RequireAuth.js` 包在 `app/{orders,customers,stats}/layout.js`
- BottomNav 依登入狀態切換(訪客只見「今日備貨+登入」;登入後五個 tab)

## 頁面與功能(全部已完成並實測)

| 路由 | 功能 |
|---|---|
| `/` | 今日備貨:單日訂單品項彙總 checklist(name+unit 分組)、已備/未備數量、進度條、樂觀更新勾選(失敗回滾)、日期可切換(清空防呆) |
| `/orders` | 訂單列表:按日期分組、今天/明天 badge、備貨進度 badge、編輯/刪除/匯出 |
| `/orders/new`、`/orders/[id]/edit` | 共用 `components/OrderForm.js`(重點見下) |
| `/orders/[id]/receipt` | 單據:Canvas 畫成 PNG 圖(3x 解析度)→ Web Share API 分享(LINE)/下載;不支援分享自動退為下載。**沒有 PDF**(已改掉) |
| `/customers` | 客戶 CRUD + **批次匯入**(貼名單一行一人,自動辨識電話/車牌/地址,同名標「已存在」跳過) |
| `/stats` | 銷量統計:週(週一起)/月/季切換、MongoDB aggregation(`/api/stats`)、摘要卡+重點列表(stat-line)、SVG 長條圖(點擊看明細)、品項/客戶排行 |
| `/login` | 登入/登出 + 「不登入只看今日備貨」 |

**OrderForm 重點**:客戶可搜尋下拉(姓名/電話/車牌過濾,pointerdown 選取,找不到可「＋直接新增」快速建客戶)、日期預設明天、「帶入上次訂單」提示卡(`GET /api/orders?customerId=&limit=1`)、品項列兩行網格排版(卡片式)、自動總計、**AI 解析框**(見下)。

## AI 解析訂單(Gemini)

- `app/api/ai/parse-order/route.js`:貼 LINE 文字 → 結構化品項+日期
- 模型 **`gemini-flash-latest`**(官方別名;曾因 gemini-2.5-flash 對新金鑰 404 而換,勿寫死版本號)
- REST fetch(零 SDK),金鑰在 `x-goog-api-key` header,30 秒逾時
- **`responseSchema` 強制 JSON**(constrained decoding)+ system prompt 教規則(中文數字轉換、「不用了」剔除、改口取最後值)+ few-shot
- **日期解析**:前端把手機本地「今天」送上來(`{text, today}`),prompt 動態組入今天+星期 → 「明天/後天/禮拜六/X號」轉 YYYY-MM-DD;沒提到=null(表單維持預設明天)。**不可用伺服器時間**(Vercel 是 UTC)。後端驗證:格式不對或早於今天一律 null
- **不解析客戶名**(已拿掉 — 客人對老闆說話不會自報姓名)
- 金額 AI 不填(訊息裡沒價錢),留白由人補;解析結果只填表單草稿,人確認後才儲存
- 錯誤都轉繁中人話:429=額度、502=服務掛、422=看不懂
- 免費層額度:~10-15 RPM/數百 RPD,超過回 429 不會扣錢

## LINE 官方帳號自動收單(2026-07-24 完成)

流程:家人把客人訊息轉傳到 LINE OA → `app/api/line/webhook/route.js` → 共用 `lib/parse-order-text.js`(Gemini)解析 → 建「待確認」訂單(無客戶、金額 0)→ 家人在 /orders 置頂的待確認區塊點「確認訂單」→ 編輯頁看原始訊息、選客戶、補金額 → 確認轉正。

- **簽章驗證**:`x-line-signature` = HMAC-SHA256(channel secret, raw body) base64;要用 `req.text()` 拿 raw body,timingSafeEqual 比對。訪客/cookie 邏輯不適用這條 route
- **去重**:訂單存 `lineEventId`(LINE 的 webhookEventId),重送時查到同 id 就跳過。**不可**看到 isRedelivery 一律跳過(上一批可能超時只處理一半,沒處理到的只會出現在重送裡)
- **不丟單原則**:Gemini 掛掉(429/連線失敗)→ 建一張 items 為空、只有 sourceText 的待確認單,家人手動補;只有「解析不出品項」(閒聊貼圖)才靜默跳過
- **時區**:webhook 沒有前端帶 today,用台灣時區手算(`Date.now()+8h` 後取 getUTC*,台灣無日光節約)
- **timeout**:`maxDuration = 60`,單則 Gemini 逾時 12 秒(一個 webhook 可能帶多則訊息序列處理)
- **pending 排除**:備貨頁 `GET /api/orders?date=`、PATCH 勾備貨、stats 全部 aggregation 都排除 pending;PUT 帶 `status:"confirmed"` 只允許 pending→confirmed 且必須有客戶
- **使用者要自己做的設定**(未完成前功能不會動):LINE Developers 建 Messaging API channel → channel secret / access token 填 .env 與 Vercel 環境變數 → webhook URL 設 `https://<vercel網址>/api/line/webhook` 並啟用 Use webhook → 關閉自動回應訊息(不然客人會收到罐頭回覆)

## 慣例與注意事項

- 日期一律本地時區手動組 `YYYY-MM-DD`,**嚴禁 `toISOString().slice()`**
- Next 15:route handler 的 `params` 是 Promise 要 `await`;`cookies()` 要 `await`
- PATCH 勾備貨有 `items.{i} $exists` 防越界污染;訂單 GET 不帶 date 需登入
- 金額顯示 `NT$ x,xxx`(toLocaleString);input 字體 ≥16px 防 iOS 縮放;觸控目標 ≥44px
- 手機自訂下拉選項用 `onPointerDown + preventDefault`(搶在 blur 前)
- 驗證登入流程可在 console 用 `fetch('/api/auth/login', {method:'POST', ...password:'azhu1234'})`

## 待辦/未來方向(使用者提過但未做)

1. ~~LINE 官方帳號 + webhook 全自動收單~~(**已完成**,見上方專章;剩使用者端的 LINE Developers 設定)
2. 語音輸入訂單(Web Speech API → 共用 parse-order)
3. 統計頁前後期切換(目前只能看本週/本月/本季)
4. Code review 剩餘 MINOR 未收:刪客戶不警告孤兒訂單、品項列 key 用 index、備貨頁勾選時群組即時重排、編輯訂單會蓋掉編輯期間的備貨勾選
5. PWA manifest(加到主畫面像 app)
6. Atlas 密碼曾在對話中曝光過,建議使用者換掉(已提醒過)
7. 品項單價表(AI 解析後自動帶金額)— 討論過未做
