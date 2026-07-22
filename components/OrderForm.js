"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const COMMON_UNITS = ["斤", "公斤", "兩", "把", "顆", "粒", "箱", "袋", "包", "條", "隻"];

// 以本地時區計算「明天」的 YYYY-MM-DD(不要用 toISOString,避免時區偏移)
function tomorrowLocal() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyRow() {
  return { name: "", qty: "", unit: "", amount: "", prepared: false };
}

// "2026-07-21" → "7/21"
function formatShortDate(dateStr) {
  const parts = (dateStr || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return dateStr || "";
  return `${parts[1]}/${parts[2]}`;
}

// 品項摘要：「高麗菜、蔥 等 4 項」
function itemsSummary(items) {
  const names = (items || []).map((i) => i.name).filter(Boolean);
  if (names.length === 0) return "無品項";
  if (names.length <= 2) return names.join("、");
  return `${names.slice(0, 2).join("、")} 等 ${names.length} 項`;
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
  const isEdit = !!initial;

  const [customers, setCustomers] = useState(null); // null = 載入中
  const [loadError, setLoadError] = useState("");
  const [customerId, setCustomerId] = useState(initial ? initial.customerId : "");
  const [customerQuery, setCustomerQuery] = useState(initial ? initial.customerName || "" : "");
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [quickAdding, setQuickAdding] = useState(false);
  const [quickAddError, setQuickAddError] = useState("");
  const [date, setDate] = useState(initial ? initial.date : tomorrowLocal());
  const [items, setItems] = useState(
    initial && Array.isArray(initial.items) && initial.items.length > 0
      ? initial.items.map(toRow)
      : [emptyRow()]
  );
  const [errors, setErrors] = useState({});
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
    if (hasInput && !window.confirm("會覆蓋你目前已填的品項,確定帶入上次訂單嗎?")) {
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
          setLoadError("客戶名單載入失敗,請重新整理再試");
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
      if (!res.ok) throw new Error(data.error || "新增失敗,請稍後再試");
      setCustomers((prev) =>
        [...(prev || []), data].sort((a, b) => (a.name || "").localeCompare(b.name || "", "zh-Hant"))
      );
      selectCustomer(data);
    } catch (err) {
      setQuickAddError(err.message || "新增失敗,請稍後再試");
      setShowCustomerList(true);
    } finally {
      setQuickAdding(false);
    }
  }

  function updateItem(i, field, value) {
    setItems((prev) => prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
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
        ? "請從清單中點選客戶"
        : "請選擇客戶";
    }
    const validItems = items.filter((row) => row.name.trim());
    if (validItems.length === 0) nextErrors.items = "請至少填寫一個品項名稱";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

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

    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/orders/${initial._id}` : "/api/orders", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let msg = "儲存失敗,請稍後再試";
        try {
          const data = await res.json();
          if (data && data.error) msg = data.error;
        } catch (_) {}
        setSubmitError(msg);
        setSaving(false);
        return;
      }
      router.push("/orders");
    } catch (_) {
      setSubmitError("連線失敗,請檢查網路後再試");
      setSaving(false);
    }
  }

  if (customers === null) {
    return <p className="text-muted mt-4">載入客戶名單中…</p>;
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
        <p className="empty-text">還沒有客戶</p>
        <p className="empty-hint">要先有客戶,才能建立訂單</p>
        <Link href="/customers" className="btn btn-primary">先去新增客戶</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {loadError && <p className="field-error">{loadError}</p>}

      <div className="field">
        <label className="field-label" htmlFor="customer">客戶</label>
        <div className="combo">
          <input
            className={errors.customer ? "input input-error" : "input"}
            id="customer"
            type="text"
            placeholder="輸入姓名搜尋（電話、車牌也可以）"
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
              aria-label="清除客戶"
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
                <p>找不到「{customerQuery.trim()}」</p>
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
                    {quickAdding ? "新增中…" : `＋ 直接新增「${customerQuery.trim()}」`}
                  </button>
                )}
                {quickAddError && <p className="field-error mt-2">{quickAddError}</p>}
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
        {errors.customer && <p className="field-error">{errors.customer}</p>}
      </div>

      {lastOrder && (
        <div className="suggest-box">
          <div className="suggest-text">
            <span className="font-bold">上次訂單</span>
            <span className="text-muted text-sm">
              {" "}
              {formatShortDate(lastOrder.date)} · {itemsSummary(lastOrder.items)} · NT${" "}
              {(Number(lastOrder.total) || 0).toLocaleString()}
            </span>
          </div>
          <button type="button" className="btn btn-ghost suggest-btn" onClick={applyLastOrder}>
            帶入
          </button>
        </div>
      )}

      <div className="field">
        <label className="field-label" htmlFor="date">訂單日期</label>
        <input
          className="input"
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="field">
        <span className="field-label">品項</span>
        {items.map((row, i) => (
          <div className="item-row" key={i}>
            <input
              className="input item-row-name"
              placeholder="品名"
              aria-label={`品項 ${i + 1} 品名`}
              value={row.name}
              onChange={(e) => updateItem(i, "name", e.target.value)}
            />
            <input
              className="input item-row-qty"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="數量"
              aria-label={`品項 ${i + 1} 數量`}
              value={row.qty}
              onChange={(e) => updateItem(i, "qty", e.target.value)}
            />
            <input
              className="input item-row-qty"
              list="unit-options"
              placeholder="單位"
              aria-label={`品項 ${i + 1} 單位`}
              value={row.unit}
              onChange={(e) => updateItem(i, "unit", e.target.value)}
            />
            <input
              className="input item-row-price"
              type="number"
              inputMode="numeric"
              min="0"
              step="any"
              placeholder="金額"
              aria-label={`品項 ${i + 1} 金額`}
              value={row.amount}
              onChange={(e) => updateItem(i, "amount", e.target.value)}
            />
            <button
              type="button"
              className="btn btn-icon btn-ghost-danger"
              aria-label={`刪除品項 ${i + 1}`}
              disabled={items.length <= 1}
              onClick={() => removeItem(i)}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        ))}
        <datalist id="unit-options">
          {COMMON_UNITS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
        {errors.items && <p className="field-error">{errors.items}</p>}
        <button type="button" className="btn btn-ghost btn-block" onClick={addItem}>
          + 新增品項
        </button>
      </div>

      <div className="total-bar">
        <span className="total-bar-label">總計</span>
        <span className="amount">NT$ {total.toLocaleString()}</span>
      </div>

      {submitError && <p className="field-error mt-2">{submitError}</p>}

      <div className="btn-row mt-4">
        <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => router.push("/orders")}>
          取消
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "儲存中…" : "儲存訂單"}
        </button>
      </div>
    </form>
  );
}
