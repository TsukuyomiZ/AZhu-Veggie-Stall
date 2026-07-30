"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

// 單位是資料(隨訂單存進 DB),不翻譯
const COMMON_UNITS = ["斤", "公斤", "兩", "把", "顆", "粒", "箱", "袋", "包", "條", "隻"];

// 數量快選數字鍵:點一下累加在尾端(先點 1 再點 3 = 13)
const QTY_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

// 以本地時區計算 YYYY-MM-DD(不要用 toISOString,避免時區偏移)
function localDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function tomorrowLocal() {
  return localDateStr(1);
}

function emptyRow() {
  return { name: "", qty: "", unit: "", amount: "", prepared: false };
}

// "2026-07-21" → zh "7/21" / vi "21/7"(月日順序走字典)
function formatShortDate(dateStr, t) {
  const parts = (dateStr || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return dateStr || "";
  return t("date.shortDate", { m: parts[1], d: parts[2] });
}

// 品項摘要:「高麗菜、蔥 等 4 項」(品項名是資料不翻,句型走字典)
function itemsSummary(items, t) {
  const names = (items || []).map((i) => i.name).filter(Boolean);
  if (names.length === 0) return t("orders.noItems");
  if (names.length <= 2) return names.join("、");
  return t("orders.moreItems", { names: names.slice(0, 2).join("、"), n: names.length });
}

// AI 解析結果合併進現有品項列:同名且單位相容(相同或其一沒填)→ 數量相加,
// 其餘附加到列表後面;不再整份覆蓋
function mergeParsedItems(prev, parsed) {
  const rows = prev
    .filter((row) => row.name.trim()) // 丟掉還沒填的空白列
    .map((row) => ({ ...row }));
  for (const it of parsed || []) {
    const name = (it.name || "").trim();
    if (!name) continue;
    const unit = (it.unit || "").trim();
    const hit = rows.find(
      (row) =>
        row.name.trim() === name &&
        (!unit || !row.unit.trim() || row.unit.trim() === unit)
    );
    if (hit) {
      const sum = (Number(hit.qty) || 0) + (Number(it.qty) || 0);
      hit.qty = sum ? String(Math.round(sum * 1000) / 1000) : ""; // 避免 0.1+0.2 浮點尾數
      if (!hit.unit.trim() && unit) hit.unit = unit;
    } else {
      rows.push({
        name,
        qty: it.qty ? String(it.qty) : "",
        unit,
        amount: "", // 金額訊息裡通常沒有,由人補
        prepared: false,
      });
    }
  }
  return rows.length > 0 ? rows : [emptyRow()];
}

function toRow(item) {
  return {
    name: item.name || "",
    qty: item.qty === 0 || item.qty == null ? "" : String(item.qty),
    unit: item.unit || "",
    amount: item.amount === 0 || item.amount == null ? "" : String(item.amount),
    prepared: !!item.prepared, // 保留原本的備貨狀態,新列為 false
  };
}

export default function OrderForm({ initial = null }) {
  const router = useRouter();
  const { t } = useI18n();
  const isEdit = !!initial;
  // LINE 自動收單的待確認訂單:確認流程 = 選客戶 + 補金額 → 轉正
  const isPending = !!(initial && initial.status === "pending");

  const [customers, setCustomers] = useState(null); // null = 載入中
  // 錯誤/提示 state 一律存「字典 key 或伺服器原文」,render 時才 t():
  // key 會翻譯、伺服器中文原文查不到 key 會原樣顯示,切語言也即時生效
  const [loadError, setLoadError] = useState("");
  const [customerId, setCustomerId] = useState(initial ? initial.customerId : "");
  const [customerQuery, setCustomerQuery] = useState(initial ? initial.customerName || "" : "");
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [quickAdding, setQuickAdding] = useState(false);
  const [quickAddError, setQuickAddError] = useState("");
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiNotice, setAiNotice] = useState(null); // { n, date|null }
  const [date, setDate] = useState(initial ? initial.date : tomorrowLocal());
  const [items, setItems] = useState(
    initial && Array.isArray(initial.items) && initial.items.length > 0
      ? initial.items.map(toRow)
      : [emptyRow()]
  );
  const [errors, setErrors] = useState({});
  // 單位快選 chips 顯示在哪一列(-1 = 不顯示);iOS 的原生 datalist 幾乎不會出現,改用自訂按鈕
  const [unitPickerRow, setUnitPickerRow] = useState(-1);
  // 數量數字鍵顯示在哪一列(同上;焦點只會在一個欄位,幾種 chips 不會同時出現)
  const [qtyPickerRow, setQtyPickerRow] = useState(-1);
  // 金額數字鍵顯示在哪一列(規則同數量:點一下累加在尾端)
  const [amountPickerRow, setAmountPickerRow] = useState(-1);
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastOrder, setLastOrder] = useState(null); // 選定客戶的上一筆訂單

  // 新增模式下，選了客戶就撈他最近一筆訂單，供一鍵帶入
  useEffect(() => {
    if (isEdit || !customerId) {
      setLastOrder(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/orders?customerId=${encodeURIComponent(customerId)}&limit=1`)
      .then((res) => {
        if (!res.ok) throw new Error("bad status");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setLastOrder(Array.isArray(data) && data[0] ? data[0] : null);
      })
      .catch(() => {
        if (!cancelled) setLastOrder(null); // 撈不到就不顯示，不影響開單
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, isEdit]);

  function applyLastOrder() {
    if (!lastOrder) return;
    const hasInput = items.some((row) => row.name.trim() || row.qty || row.amount);
    if (hasInput && !window.confirm(t("form.overwriteLastOrder"))) {
      return;
    }
    setItems(
      (lastOrder.items || []).map((it) => ({ ...toRow(it), prepared: false }))
    );
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/customers")
      .then((res) => {
        if (!res.ok) throw new Error("bad status");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setCustomers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) {
          setCustomers([]);
          setLoadError("form.customersLoadFailed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 依輸入文字過濾客戶（姓名/電話/車牌都可搜）
  const filteredCustomers = useMemo(() => {
    const list = customers || [];
    const q = customerQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) =>
      [c.name, c.phone, c.plate].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [customers, customerQuery]);

  function selectCustomer(c) {
    setCustomerId(c._id);
    setCustomerQuery(c.name);
    setShowCustomerList(false);
    setErrors((prev) => ({ ...prev, customer: undefined }));
  }

  function clearCustomer() {
    setCustomerId("");
    setCustomerQuery("");
    setLastOrder(null);
    setShowCustomerList(true);
  }

  // 搜尋不到時，用輸入的名字一鍵建立新客戶並直接選取（不中斷開單流程）
  async function quickAddCustomer() {
    const name = customerQuery.trim();
    if (!name || quickAdding) return;
    setQuickAdding(true);
    setQuickAddError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      // 伺服器回的 data.error 是中文原文,照原樣顯示;沒有才用字典 key
      if (!res.ok) throw new Error(data.error || "form.quickAddFailed");
      setCustomers((prev) =>
        [...(prev || []), data].sort((a, b) => (a.name || "").localeCompare(b.name || "", "zh-Hant"))
      );
      selectCustomer(data);
    } catch (err) {
      setQuickAddError(err.message || "form.quickAddFailed");
      setShowCustomerList(true);
    } finally {
      setQuickAdding(false);
    }
  }

  // 貼上 LINE 訊息 → AI 解析成品項,合併進表單(同名品項數量相加,金額留白由人補)
  async function handleAiParse() {
    const text = aiText.trim();
    if (!text || aiBusy) return;
    setAiBusy(true);
    setAiError("");
    setAiNotice(null);
    try {
      const res = await fetch("/api/ai/parse-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 帶上手機的「今天」,AI 才能把「明天」「禮拜六」換算成正確日期
        body: JSON.stringify({ text, today: localDateStr(0) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "ai.parseFailed");

      setItems((prev) => mergeParsedItems(prev, data.items));

      if (data.date) {
        setDate(data.date);
        setAiNotice({ n: data.items.length, date: data.date });
      } else {
        setAiNotice({ n: data.items.length, date: null });
      }
    } catch (err) {
      setAiError(err.message || "ai.parseFailed");
    } finally {
      setAiBusy(false);
    }
  }

  function updateItem(i, field, value) {
    setItems((prev) => prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  }

  // 數量/金額共用的快選數字鍵:點一下累加在尾端,「0」開頭時換成新數字避免 03
  function digitPad(i, field, value) {
    return (
      <div className="unit-chips">
        {QTY_DIGITS.map((d) => (
          <button
            type="button"
            key={d}
            className="unit-chip"
            onPointerDown={(e) => {
              e.preventDefault(); // 同單位 chips:搶在 input blur 之前執行
              updateItem(i, field, value === "0" ? d : value + d);
            }}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          className="unit-chip"
          aria-label={t("form.qtyBackspace")}
          onPointerDown={(e) => {
            e.preventDefault();
            updateItem(i, field, value.slice(0, -1));
          }}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 6H8l-5 6 5 6h13a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1Z" />
            <path d="m18 9-6 6" />
            <path d="m12 9 6 6" />
          </svg>
        </button>
      </div>
    );
  }

  function addItem() {
    setItems((prev) => [...prev, emptyRow()]);
  }

  function removeItem(i) {
    setItems((prev) => {
      if (prev.length <= 1) return prev; // 至少保留一列
      return prev.filter((_, idx) => idx !== i);
    });
  }

  const total = items.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");

    const nextErrors = {};
    if (!customerId) {
      nextErrors.customer = customerQuery.trim()
        ? "form.pickFromList"
        : isPending
          ? "form.selectCustomerFirst"
          : "form.selectCustomer";
    }
    const validItems = items.filter((row) => row.name.trim());
    if (validItems.length === 0) nextErrors.items = "form.needItem";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      // 待確認訂單:客戶欄在表單最上面,送出鈕在最下面,補一個就近提示
      if (isPending && nextErrors.customer) {
        setSubmitError("form.pendingCustomerHint");
      }
      return;
    }

    const selected = (customers || []).find((c) => c._id === customerId);
    const body = {
      customerId,
      customerName: selected ? selected.name : (initial ? initial.customerName : ""),
      date,
      items: validItems.map((row) => ({
        name: row.name.trim(),
        qty: Number(row.qty) || 0, // 空白視為 0
        unit: row.unit.trim(),
        amount: Number(row.amount) || 0, // 空白視為 0
        prepared: !!row.prepared,
      })),
    };
    if (isPending) body.status = "confirmed"; // 待確認 → 轉正;一般訂單不帶 status

    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/orders/${initial._id}` : "/api/orders", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let msg = "form.saveFailed";
        try {
          const data = await res.json();
          if (data && data.error) msg = data.error; // 伺服器中文原文,照原樣顯示
        } catch (_) {}
        setSubmitError(msg);
        setSaving(false);
        return;
      }
      router.push("/orders");
    } catch (_) {
      setSubmitError("form.networkFailed");
      setSaving(false);
    }
  }

  if (customers === null) {
    return <p className="text-muted mt-4">{t("form.loadingCustomers")}</p>;
  }

  if (customers.length === 0 && !loadError) {
    return (
      <div className="empty">
        <div className="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 8v6" />
            <path d="M22 11h-6" />
          </svg>
        </div>
        <p className="empty-text">{t("form.noCustomers")}</p>
        <p className="empty-hint">{t("form.noCustomersHint")}</p>
        <Link href="/customers" className="btn btn-primary">{t("form.goAddCustomer")}</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {loadError && <p className="field-error">{t(loadError)}</p>}

      {isPending && initial.sourceText && (
        <div className="source-text-card">
          <p className="source-text-label">{t("form.sourceLabel")}</p>
          <p className="source-text-body">{initial.sourceText}</p>
        </div>
      )}

      <div className={isPending ? "field field-highlight" : "field"}>
        <label className="field-label" htmlFor="customer">{t("form.customer")}</label>
        {isPending && (
          <p className="field-hint">{t("form.pendingHint")}</p>
        )}
        <div className="combo">
          <input
            className={errors.customer ? "input input-error" : "input"}
            id="customer"
            type="text"
            placeholder={t("form.customerPlaceholder")}
            autoComplete="off"
            value={customerQuery}
            onChange={(e) => {
              setCustomerQuery(e.target.value);
              setCustomerId(""); // 改了字就取消原本的選擇，必須重新點選
              setShowCustomerList(true);
            }}
            onFocus={() => setShowCustomerList(true)}
            onBlur={() => setTimeout(() => setShowCustomerList(false), 150)}
          />
          {customerQuery && (
            <button
              type="button"
              className="combo-clear"
              aria-label={t("form.clearCustomer")}
              onClick={clearCustomer}
            >
              ✕
            </button>
          )}
          {customerId && <span className="combo-check" aria-hidden="true">✓</span>}
        </div>
        {showCustomerList && !customerId && (
          <div className="combo-list">
            {filteredCustomers.length === 0 ? (
              <div className="combo-empty">
                <p>{t("form.notFound", { q: customerQuery.trim() })}</p>
                {customerQuery.trim() && (
                  <button
                    type="button"
                    className="btn btn-primary btn-block mt-2"
                    disabled={quickAdding}
                    onPointerDown={(e) => {
                      e.preventDefault(); // 搶在 input blur 之前執行
                      quickAddCustomer();
                    }}
                  >
                    {quickAdding ? t("form.adding") : t("form.quickAdd", { q: customerQuery.trim() })}
                  </button>
                )}
                {quickAddError && <p className="field-error mt-2">{t(quickAddError)}</p>}
              </div>
            ) : (
              filteredCustomers.slice(0, 30).map((c) => (
                <button
                  type="button"
                  className="combo-option"
                  key={c._id}
                  onPointerDown={(e) => {
                    e.preventDefault(); // 搶在 input blur 之前完成選取
                    selectCustomer(c);
                  }}
                >
                  <span className="combo-option-name">{c.name}</span>
                  {(c.plate || c.phone) && (
                    <span className="combo-option-sub">{c.plate || c.phone}</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
        {errors.customer && <p className="field-error">{t(errors.customer)}</p>}
      </div>

      {lastOrder && (
        <div className="suggest-box">
          <div className="suggest-text">
            <span className="font-bold">{t("form.lastOrder")}</span>
            <span className="text-muted text-sm">
              {" "}
              {formatShortDate(lastOrder.date, t)} · {itemsSummary(lastOrder.items, t)} · NT${" "}
              {(Number(lastOrder.total) || 0).toLocaleString()}
            </span>
          </div>
          <button type="button" className="btn btn-ghost suggest-btn" onClick={applyLastOrder}>
            {t("form.apply")}
          </button>
        </div>
      )}

      <div className="field">
        <label className="field-label" htmlFor="date">{t("form.date")}</label>
        <input
          className="input"
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="ai-box">
        <label className="field-label" htmlFor="ai-text">
          {t("ai.label")}
        </label>
        <textarea
          className="textarea"
          id="ai-text"
          rows={3}
          placeholder={t("ai.placeholder")}
          value={aiText}
          onChange={(e) => setAiText(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-primary btn-block mt-2"
          disabled={aiBusy || !aiText.trim()}
          onClick={handleAiParse}
        >
          {aiBusy ? t("ai.parsing") : t("ai.parse")}
        </button>
        {aiError && <p className="field-error mt-2">{t(aiError)}</p>}
        {aiNotice && (
          <p className="ai-notice mt-2">
            {aiNotice.date
              ? t("ai.noticeWithDate", { n: aiNotice.n, date: formatShortDate(aiNotice.date, t) })
              : t("ai.notice", { n: aiNotice.n })}
          </p>
        )}
      </div>

      <div className="field">
        <span className="field-label">{t("form.items")}</span>
        {items.map((row, i) => (
          <div className="item-row" key={i}>
            <input
              className="input item-row-name"
              placeholder={t("form.name")}
              aria-label={t("form.ariaName", { i: i + 1 })}
              value={row.name}
              onChange={(e) => updateItem(i, "name", e.target.value)}
            />
            <input
              className="input item-row-qty"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder={t("form.qty")}
              aria-label={t("form.ariaQty", { i: i + 1 })}
              value={row.qty}
              onChange={(e) => updateItem(i, "qty", e.target.value)}
              onFocus={() => setQtyPickerRow(i)}
              onClick={() => setQtyPickerRow(i)}
              onBlur={() =>
                setTimeout(() => setQtyPickerRow((cur) => (cur === i ? -1 : cur)), 150)
              }
            />
            <input
              className="input item-row-unit"
              placeholder={t("form.unit")}
              aria-label={t("form.ariaUnit", { i: i + 1 })}
              value={row.unit}
              onChange={(e) => updateItem(i, "unit", e.target.value)}
              onFocus={() => setUnitPickerRow(i)}
              onClick={() => setUnitPickerRow(i)}
              onBlur={() =>
                setTimeout(() => setUnitPickerRow((cur) => (cur === i ? -1 : cur)), 150)
              }
            />
            <input
              className="input item-row-price"
              type="number"
              inputMode="numeric"
              min="0"
              step="any"
              placeholder={t("form.amount")}
              aria-label={t("form.ariaAmount", { i: i + 1 })}
              value={row.amount}
              onChange={(e) => updateItem(i, "amount", e.target.value)}
              onFocus={() => setAmountPickerRow(i)}
              onClick={() => setAmountPickerRow(i)}
              onBlur={() =>
                setTimeout(() => setAmountPickerRow((cur) => (cur === i ? -1 : cur)), 150)
              }
            />
            <button
              type="button"
              className="btn btn-icon btn-ghost-danger"
              aria-label={t("form.ariaRemove", { i: i + 1 })}
              disabled={items.length <= 1}
              onClick={() => removeItem(i)}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
            {unitPickerRow === i && (
              <div className="unit-chips">
                {COMMON_UNITS.map((u) => (
                  <button
                    type="button"
                    key={u}
                    className={row.unit === u ? "unit-chip unit-chip-active" : "unit-chip"}
                    onPointerDown={(e) => {
                      e.preventDefault(); // 搶在 input blur 之前填入,鍵盤不縮
                      updateItem(i, "unit", u);
                      setUnitPickerRow(-1);
                    }}
                  >
                    {u}
                  </button>
                ))}
              </div>
            )}
            {qtyPickerRow === i && digitPad(i, "qty", row.qty)}
            {amountPickerRow === i && digitPad(i, "amount", row.amount)}
          </div>
        ))}
        {errors.items && <p className="field-error">{t(errors.items)}</p>}
        <button type="button" className="btn btn-ghost btn-block" onClick={addItem}>
          {`+ ${t("form.addItem")}`}
        </button>
      </div>

      <div className="total-bar">
        <span className="total-bar-label">{t("form.total")}</span>
        <span className="amount">NT$ {total.toLocaleString()}</span>
      </div>

      {submitError && <p className="field-error mt-2">{t(submitError)}</p>}

      <div className="btn-row mt-4">
        <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => router.push("/orders")}>
          {t("common.cancel")}
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving
            ? isPending ? t("form.confirming") : t("form.saving")
            : isPending ? t("form.confirmOrder") : t("form.saveOrder")}
        </button>
      </div>
    </form>
  );
}
