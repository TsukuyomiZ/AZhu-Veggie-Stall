"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

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

function formatMoney(n) {
  return `NT$ ${(Number(n) || 0).toLocaleString()}`;
}

// 品項摘要:「高麗菜、青蔥 等 3 項」(品項名是資料不翻,句型走字典)
function itemSummary(items, t) {
  const names = (items || []).map((i) => i.name).filter(Boolean);
  if (names.length === 0) return t("orders.noItems");
  if (names.length <= 2) return names.join("、");
  return t("orders.moreItems", { names: names.slice(0, 2).join("、"), n: names.length });
}

export default function OrdersPage() {
  const { t } = useI18n();
  const [orders, setOrders] = useState(null); // null = 載入中
  const [error, setError] = useState(""); // 存字典 key,render 時才 t(),切語言即時生效
  const [deletingId, setDeletingId] = useState(null);

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
      setOrders((prev) => prev.filter((o) => o._id !== order._id));
    } catch (_) {
      window.alert(t("orders.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  const today = localDateStr(0);
  const tomorrow = localDateStr(1);

  // 待確認訂單(LINE 自動收單)獨立置頂,不進日期分組
  const pendingOrders = orders ? orders.filter((o) => o.status === "pending") : [];

  // 按日期分組(API 已由新到舊排序,維持原順序;排除待確認)
  const groups = [];
  if (orders) {
    const map = new Map();
    for (const o of orders) {
      if (o.status === "pending") continue;
      if (!map.has(o.date)) {
        map.set(o.date, { date: o.date, orders: [] });
        groups.push(map.get(o.date));
      }
      map.get(o.date).orders.push(o);
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

      {error && <p className="field-error">{t(error)}</p>}

      {orders === null && <p className="text-muted mt-4">{t("common.loading")}</p>}

      {orders !== null && orders.length === 0 && !error && (
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
              {group.orders.map((order) => {
                const items = order.items || [];
                const preparedCount = items.filter((i) => i.prepared).length;
                const allPrepared = items.length > 0 && preparedCount === items.length;
                return (
                  <div className="card" key={order._id}>
                    <div className="row-between">
                      <span className="font-bold" style={{ fontSize: "var(--fs-lg)" }}>
                        {order.customerName}
                      </span>
                      <span className={allPrepared ? "badge badge-green" : "badge badge-amber"}>
                        {t("orders.preparedBadge", { done: preparedCount, total: items.length })}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="item-line">
                        <span>{itemSummary(items, t)}</span>
                      </div>
                    </div>
                    <hr className="divider" />
                    <div className="row-between">
                      <span className="text-muted">{t("orders.subtotal")}</span>
                      <span className="amount-sm">{formatMoney(order.total)}</span>
                    </div>
                    <div className="btn-row mt-2">
                      <Link href={`/orders/${order._id}/receipt`} className="btn btn-ghost">
                        {t("orders.export")}
                      </Link>
                      <Link href={`/orders/${order._id}/edit`} className="btn btn-ghost">
                        {t("common.edit")}
                      </Link>
                      <button
                        type="button"
                        className="btn btn-ghost-danger"
                        disabled={deletingId === order._id}
                        onClick={() => handleDelete(order)}
                      >
                        {deletingId === order._id ? t("orders.deleting") : t("common.delete")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
