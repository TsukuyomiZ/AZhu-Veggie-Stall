"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import OrderCard, { formatMoney, itemSummary } from "@/components/OrderCard";

// 以本地時區取得某天(offset 天後)的 YYYY-MM-DD
function localDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// "2026-07-21" → zh "7/21 (二)" / vi "21/7 (T3)"(月日順序與星期字樣都走字典)
function formatDateLabel(dateStr, t) {
  const parts = (dateStr || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return dateStr || t("orders.noDate");
  }
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return t("date.shortFormat", {
    m: parts[1],
    d: parts[2],
    w: t(`weekday.${d.getDay()}`),
  });
}

export default function OrdersPage() {
  const { t } = useI18n();
  const [orders, setOrders] = useState(null); // null = 載入中
  const [error, setError] = useState(""); // 存字典 key,render 時才 t(),切語言即時生效
  const [deletingId, setDeletingId] = useState(null);

  // 「查其他日期」收合查詢:range 有值=查詢模式(取代預設列表),null=預設(今天與之後)
  const [searchOpen, setSearchOpen] = useState(false);
  const [from, setFrom] = useState(() => localDateStr(-7));
  const [to, setTo] = useState(() => localDateStr(0));
  const [range, setRange] = useState(null); // { from, to, orders }
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(""); // 存字典 key

  useEffect(() => {
    let cancelled = false;
    fetch("/api/orders")
      .then((res) => {
        if (!res.ok) throw new Error("bad status");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setOrders(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) {
          setOrders([]);
          setError("orders.loadFailed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    if (from > to) {
      setSearchError("orders.rangeError");
      return;
    }
    setSearching(true);
    setSearchError("");
    fetch(`/api/orders?from=${from}&to=${to}`)
      .then((res) => {
        if (!res.ok) throw new Error("bad status");
        return res.json();
      })
      .then((data) => {
        setRange({ from, to, orders: Array.isArray(data) ? data : [] });
        setSearching(false);
      })
      .catch(() => {
        setSearchError("orders.loadFailed");
        setSearching(false);
      });
  }

  async function handleDelete(order) {
    const ok = window.confirm(
      order.customerName
        ? t("orders.deleteConfirmNamed", { name: order.customerName })
        : t("orders.deleteConfirmPending")
    );
    if (!ok) return;
    setDeletingId(order._id);
    try {
      const res = await fetch(`/api/orders/${order._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("bad status");
      // 預設列表與查詢結果都要同步移除
      setOrders((prev) => (prev || []).filter((o) => o._id !== order._id));
      setRange((prev) =>
        prev ? { ...prev, orders: prev.orders.filter((o) => o._id !== order._id) } : prev
      );
    } catch (_) {
      window.alert(t("orders.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  const today = localDateStr(0);
  const tomorrow = localDateStr(1);

  // 待確認訂單(LINE 自動收單)獨立置頂,只在預設模式顯示
  const pendingOrders =
    !range && orders ? orders.filter((o) => o.status === "pending") : [];

  // 按日期分組。
  // 預設模式:只顯示今天與之後(過去的用「查其他日期」),今天最上、再來明天、之後依序。
  // 查詢模式:顯示查詢區間結果,維持 API 的新到舊順序。
  const groups = [];
  const source = range ? range.orders : orders;
  if (source) {
    const map = new Map();
    for (const o of source) {
      if (!range) {
        if (o.status === "pending") continue;
        if (!o.date || o.date < today) continue;
      }
      if (!map.has(o.date)) {
        map.set(o.date, { date: o.date, orders: [] });
        groups.push(map.get(o.date));
      }
      map.get(o.date).orders.push(o);
    }
    if (!range) {
      groups.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">{t("orders.title")}</h1>
        </div>
        <Link href="/orders/new" className="btn btn-primary">{`+ ${t("orders.addOrder")}`}</Link>
      </header>

      <button
        type="button"
        className="btn btn-ghost btn-block"
        aria-expanded={searchOpen}
        onClick={() => setSearchOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
        {t("orders.searchOther")}
      </button>

      {searchOpen && (
        <form className="mt-2" onSubmit={handleSearch}>
          <div className="form-row">
            <div className="field">
              <label className="field-label" htmlFor="search-from">
                {t("orders.from")}
              </label>
              <input
                className="input"
                id="search-from"
                type="date"
                value={from}
                onChange={(e) => {
                  if (e.target.value) setFrom(e.target.value);
                }}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="search-to">
                {t("orders.to")}
              </label>
              <input
                className="input"
                id="search-to"
                type="date"
                value={to}
                onChange={(e) => {
                  if (e.target.value) setTo(e.target.value);
                }}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={searching}>
            {searching ? t("orders.searching") : t("orders.search")}
          </button>
        </form>
      )}

      {searchError && <p className="field-error mt-2">{t(searchError)}</p>}

      {range && (
        <div className="card mt-4">
          <div className="row-between">
            <div>
              <div className="font-bold">
                {t("orders.showingRange", {
                  from: formatDateLabel(range.from, t),
                  to: formatDateLabel(range.to, t),
                })}
              </div>
              <div className="text-muted text-sm">
                {t("orders.historyCount", { n: range.orders.length })}
              </div>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setRange(null)}>
              {t("orders.backToDefault")}
            </button>
          </div>
        </div>
      )}

      {error && !range && <p className="field-error mt-4">{t(error)}</p>}

      {orders === null && !range && (
        <p className="text-muted mt-4">{t("common.loading")}</p>
      )}

      {!range && orders !== null && !error && pendingOrders.length === 0 && groups.length === 0 && (
        <div className="empty">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
              <path d="M8 7h8" />
              <path d="M8 11h8" />
            </svg>
          </div>
          <p className="empty-text">{t("orders.emptyTitle")}</p>
          <p className="empty-hint">{t("orders.emptyHint")}</p>
          <Link href="/orders/new" className="btn btn-primary">{t("orders.addOrder")}</Link>
        </div>
      )}

      {range && groups.length === 0 && (
        <div className="empty mt-4">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          </div>
          <p className="empty-text">{t("orders.historyEmpty")}</p>
          <p className="empty-hint">{t("orders.historyEmptyHint")}</p>
        </div>
      )}

      {pendingOrders.length > 0 && (
        <section className="pending-section">
          <h2 className="group-title">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 12h-6l-2 3h-4l-2-3H2" />
              <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            </svg>
            {t("orders.pending")}
            <span className="group-count">{t("orders.countOrders", { n: pendingOrders.length })}</span>
          </h2>
          <div className="list">
            {pendingOrders.map((order) => (
              <div className="card pending-card" key={order._id}>
                <div className="row-between">
                  <span className="font-bold" style={{ fontSize: "var(--fs-lg)" }}>
                    {t("orders.wantedDate", { date: formatDateLabel(order.date, t) })}
                  </span>
                  <span style={{ display: "flex", gap: "var(--space-2)" }}>
                    {order.source === "line" && <span className="badge badge-gray">{t("orders.lineBadge")}</span>}
                    <span className="badge badge-pending">{t("orders.pending")}</span>
                  </span>
                </div>
                <div className="mt-2">
                  <div className="item-line">
                    <span>{itemSummary(order.items, t)}</span>
                  </div>
                </div>
                {order.sourceText && (
                  <p className="source-preview mt-2">{order.sourceText}</p>
                )}
                <div className="btn-row mt-2">
                  <button
                    type="button"
                    className="btn btn-ghost-danger"
                    disabled={deletingId === order._id}
                    onClick={() => handleDelete(order)}
                  >
                    {deletingId === order._id ? t("orders.deleting") : t("common.delete")}
                  </button>
                  <Link href={`/orders/${order._id}/edit`} className="btn btn-primary">
                    {t("orders.confirm")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {groups.map((group) => {
        const dayTotal = group.orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        return (
          <section className="date-group" key={group.date}>
            <h2 className="group-title">
              {formatDateLabel(group.date, t)}
              {group.date === today && <span className="badge badge-green">{t("date.today")}</span>}
              {group.date === tomorrow && <span className="badge badge-amber">{t("date.tomorrow")}</span>}
              <span className="group-count">
                {t("orders.countOrders", { n: group.orders.length })} · {formatMoney(dayTotal)}
              </span>
            </h2>
            <div className="list">
              {group.orders.map((order) => (
                <OrderCard
                  key={order._id}
                  order={order}
                  deleting={deletingId === order._id}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
