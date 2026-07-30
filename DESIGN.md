# 阿珠菜攤 — 設計規範(DESIGN.md)

給頁面工程師的唯一設計依據。所有樣式都已定義在 `app/globals.css`,**請直接使用下列 class,不要自己寫 inline style 或新增顏色**。

## 設計方向

- **風格**:清爽的蔬菜攤綠色系(品牌綠 `#2f9e44`),白卡片 + 帶綠暖白底 `#f4f7f2`,圓角大、陰影淺。
- **對象**:年長使用者、只用手機。所以:基礎字 17px、觸控目標最少 48px、高對比、繁體中文、不花俏。
- **版面**:mobile-first(375–430px),內容最寬 480px 置中,桌面自然不破版。
- **圖示**:一律用 inline SVG(stroke 風格、`stroke="currentColor"`、viewBox 24x24),不要用 emoji 當圖示。

## 設計 tokens(CSS Variables,已定義於 `:root`)

| 變數 | 值 | 用途 |
|---|---|---|
| `--green-600` / `--green-700` | `#2f9e44` / `#2b8a3e` | 主色 / 按下與深色文字 |
| `--green-100` / `--green-50` | `#d3f9d8` / `#ebfbee` | 成功淺底 / 點擊回饋底色 |
| `--red-600` / `--red-700` | `#e03131` / `#c92a2a` | 刪除、錯誤 |
| `--amber-100` / `--amber-700` | `#fff3bf` / `#9a6700` | 「未備」等警告 badge |
| `--bg` / `--surface` | `#f4f7f2` / `#ffffff` | 頁面底 / 卡片底 |
| `--text` / `--text-muted` | `#1e2b20` / `#4d5c50` | 主文字 / 次要文字 |
| `--border` / `--border-strong` | `#dbe4d9` / `#b7c6b6` | 卡片框 / 輸入框 |
| `--fs-base` / `--fs-lg` / `--fs-xl` | 17px / 19px / 22px | 內文 / 強調 / 頁標題 |
| `--fs-num` / `--fs-num-lg` | 28px / 34px | 金額 / 摘要大數字 |
| `--radius-sm` / `--radius` / `--radius-lg` | 10 / 14 / 20px | 小元素 / 卡片按鈕 / 摘要卡 |
| `--tap-min` / `--tap-lg` | 48px / 56px | 觸控目標最小 / 大按鈕與輸入框 |
| `--space-1..8` | 4/8/12/16/20/24/32px | 間距 |

字型:系統字型堆疊(PingFang TC / Microsoft JhengHei / Noto Sans TC),**不要引入外部字型**。

---

## Class 總覽(速查表)

| 分類 | Class |
|---|---|
| 版面 | `.page` `.page-header` `.page-title` `.page-subtitle` |
| 卡片 | `.card` `.card-tappable` `.list` `.row-between` `.divider` `.amount` `.amount-sm` `.item-line` |
| 日期群組 | `.date-group` `.group-title` `.group-count` |
| 按鈕 | `.btn` + `.btn-primary` / `.btn-danger` / `.btn-ghost` / `.btn-ghost-danger`;`.btn-block` `.btn-row` `.btn-icon` |
| 表單 | `.field` `.field-label` `.input` `.select` `.textarea` `.field-hint` `.field-error` `.input-error` `.form-row` `.item-row`(+ `.item-row-name` `.item-row-qty` `.item-row-price`)`.unit-chips` `.unit-chip`(+ `.unit-chip-active`)`.total-bar` `.total-bar-label` |
| Checklist | `.check-group` `.check-row` `.check-box` `.check-name` `.check-qty` |
| 摘要 | `.summary-card` `.summary-title` `.summary-nums` `.summary-num` `.summary-num-value` `.summary-num-label` `.progress` `.progress-bar`(白卡片內用 `.progress-light` + `.progress-bar-green`) |
| Badge | `.badge` + `.badge-green` / `.badge-amber` / `.badge-red` / `.badge-gray` |
| 空狀態 | `.empty` `.empty-icon` `.empty-text` `.empty-hint` |
| 底部導覽 | `.bottom-nav` `.bottom-nav-inner` `.nav-item` `.nav-label` `.nav-fab-wrap` `.nav-fab` `.nav-fab-label`(已由 `components/BottomNav.js` 實作,頁面不用碰) |
| 工具 | `.stack-2` `.stack-4` `.mt-2` `.mt-4` `.mt-6` `.text-muted` `.text-sm` `.text-center` `.font-bold` |

---

## 版面骨架

`app/layout.js` 已經把每頁包在 `<main className="page">` 裡(含底部導覽空間 + iOS safe-area),**頁面元件不需要再包 `.page`**,直接從頁首開始寫:

```jsx
export default function Page() {
  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">今日備貨</h1>
          <p className="page-subtitle">7月20日(星期一)</p>
        </div>
        {/* 右側可放動作按鈕(可省略) */}
      </header>
      {/* 頁面內容 */}
    </>
  );
}
```

---

## 元件範例(可直接複製)

### 1. 摘要卡 + 進度條(今日備貨頁頂部)

```jsx
<section className="summary-card">
  <p className="summary-title">今日備貨進度</p>
  <div className="summary-nums">
    <div className="summary-num">
      <div className="summary-num-value">8</div>
      <div className="summary-num-label">已備</div>
    </div>
    <div className="summary-num">
      <div className="summary-num-value">5</div>
      <div className="summary-num-label">未備</div>
    </div>
    <div className="summary-num">
      <div className="summary-num-value">13</div>
      <div className="summary-num-label">總品項</div>
    </div>
  </div>
  <div className="progress">
    <div className="progress-bar" style={{ width: "62%" }} />
  </div>
</section>
```

### 2. Checklist 列(整列可點的大勾選框)

一列 = 一個 `<label className="check-row">` 包住**隱藏的原生 checkbox**(可及性靠它)+ `.check-box` 自訂勾選框。勾選後整列自動變淺綠、品名劃線(CSS 已處理,不用加 class)。

```jsx
<div className="check-group">
  <label className="check-row">
    <input
      type="checkbox"
      checked={item.done}
      onChange={() => toggle(item.id)}
    />
    <span className="check-box" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="4"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 13 4 4 10-10" />
      </svg>
    </span>
    <span className="check-name">高麗菜</span>
    <span className="check-qty">x 3</span>
  </label>
  {/* 更多 check-row… */}
</div>
```

品項群組標題(客戶名或分類)用日期群組同一套:

```jsx
<h2 className="group-title">王媽媽 <span className="group-count">4 項</span></h2>
```

### 3. 日期群組標題 + 訂單卡(訂單列表頁)

```jsx
<section className="date-group">
  <h2 className="group-title">
    7月20日(今天) <span className="group-count">3 筆</span>
  </h2>
  <div className="list">
    <Link href={`/orders/${order.id}/edit`} className="card card-tappable">
      <div className="row-between">
        <span className="font-bold" style={{ fontSize: "var(--fs-lg)" }}>
          王媽媽
        </span>
        <span className="badge badge-green">已備貨</span>
      </div>
      <div className="mt-2">
        <div className="item-line"><span>高麗菜</span><span>x 2</span></div>
        <div className="item-line"><span>青蔥</span><span>x 1</span></div>
      </div>
      <hr className="divider" />
      <div className="row-between">
        <span className="text-muted">合計</span>
        <span className="amount-sm">$260</span>
      </div>
    </Link>
  </div>
</section>
```

Badge 狀態對應:`badge-green` 已備貨/已完成、`badge-amber` 未備貨、`badge-red` 已取消/錯誤、`badge-gray` 中性資訊。

### 4. 表單欄位(訂單表單、客戶表單)

每個欄位都要有 `<label>` 且 `htmlFor` 對到 `id`。輸入框字體已是 17px,不會觸發 iOS 縮放。

```jsx
<div className="field">
  <label className="field-label" htmlFor="customer">客戶</label>
  <select className="select" id="customer" value={customerId}
    onChange={(e) => setCustomerId(e.target.value)}>
    <option value="">請選擇客戶</option>
    {customers.map((c) => (
      <option key={c.id} value={c.id}>{c.name}</option>
    ))}
  </select>
</div>

<div className="field">
  <label className="field-label" htmlFor="date">取貨日期</label>
  <input className="input" id="date" type="date" value={date}
    onChange={(e) => setDate(e.target.value)} />
</div>
```

錯誤狀態:input 加 `input-error`,下面放 `.field-error`:

```jsx
<div className="field">
  <label className="field-label" htmlFor="name">姓名</label>
  <input className="input input-error" id="name" />
  <p className="field-error">請輸入姓名</p>
</div>
```

兩欄並排(電話 + 暱稱之類)用 `.form-row`:

```jsx
<div className="form-row">
  <div className="field">…</div>
  <div className="field">…</div>
</div>
```

### 5. 動態品項列(訂單表單:品名 + 數量 + 單價 + 刪除)

```jsx
{items.map((item, i) => (
  <div className="item-row" key={i}>
    <input className="input item-row-name" placeholder="品名"
      aria-label={`品項 ${i + 1} 品名`} value={item.name}
      onChange={(e) => updateItem(i, "name", e.target.value)} />
    <input className="input item-row-qty" type="number" inputMode="numeric"
      placeholder="數量" aria-label={`品項 ${i + 1} 數量`} value={item.qty}
      onChange={(e) => updateItem(i, "qty", e.target.value)} />
    <input className="input item-row-price" type="number" inputMode="decimal"
      placeholder="單價" aria-label={`品項 ${i + 1} 單價`} value={item.price}
      onChange={(e) => updateItem(i, "price", e.target.value)} />
    <button type="button" className="btn btn-icon btn-ghost-danger"
      aria-label={`刪除品項 ${i + 1}`} onClick={() => removeItem(i)}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
      </svg>
    </button>
  </div>
))}

<button type="button" className="btn btn-ghost btn-block" onClick={addItem}>
  + 新增品項
</button>
```

### 6. 自動總計列 + 送出按鈕組

```jsx
<div className="total-bar">
  <span className="total-bar-label">總計</span>
  <span className="amount">$260</span>
</div>

<div className="btn-row">
  <button type="button" className="btn btn-ghost" onClick={onCancel}>取消</button>
  <button type="submit" className="btn btn-primary" disabled={saving}>
    {saving ? "儲存中…" : "儲存訂單"}
  </button>
</div>
```

送出中一定要 `disabled`(防重複點擊)。編輯頁的刪除放最下面、與儲存分開:

```jsx
<button type="button" className="btn btn-danger btn-block mt-6" onClick={onDelete}>
  刪除這筆訂單
</button>
```

### 7. 客戶卡片(客戶管理頁)

```jsx
<div className="list">
  <div className="card">
    <div className="row-between">
      <div>
        <div className="font-bold" style={{ fontSize: "var(--fs-lg)" }}>王媽媽</div>
        <div className="text-muted text-sm">0912-345-678</div>
      </div>
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button className="btn btn-ghost" onClick={() => onEdit(c)}>編輯</button>
        <button className="btn btn-ghost-danger" onClick={() => onDelete(c)}>刪除</button>
      </div>
    </div>
  </div>
</div>
```

### 8. 空狀態

```jsx
<div className="empty">
  <div className="empty-icon">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M8 7h8" /><path d="M8 11h8" />
    </svg>
  </div>
  <p className="empty-text">還沒有訂單</p>
  <p className="empty-hint">按下方綠色「+」新增第一筆訂單</p>
  <Link href="/orders/new" className="btn btn-primary">新增訂單</Link>
</div>
```

---

## 硬性規則(驗收會檢查)

1. 所有可點元素觸控目標 **≥ 48px**(用現成 `.btn` / `.check-row` / `.nav-item` 就不會錯)。
2. 表單控制項字體 **≥ 16px**(用 `.input` / `.select` 即為 17px,不要覆寫縮小)。
3. 每個 input 都有對應 `<label htmlFor>`;純圖示按鈕都要 `aria-label`。
4. 顏色只用 tokens;文字對比 ≥ 4.5:1(`--text-muted` 是最淺可用的內文色)。
5. 不用 emoji 當圖示;SVG 一律 `stroke="currentColor"`、viewBox 24x24。
6. 刪除等不可逆動作要先 `confirm`(原生 `window.confirm` 即可)並用 `btn-danger` / `btn-ghost-danger`。
7. 非同步送出時按鈕 `disabled` 並顯示「儲存中…」。
8. 不要新增外部字型、icon 套件或 CSS 框架。
