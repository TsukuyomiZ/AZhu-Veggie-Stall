"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

// 以本地時區取得某天(offset 天後)的 YYYY-MM-DD
function localDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// "2026-07-21" → "7/21 (二)"
function formatDateLabel(dateStr) {
  const parts = (dateStr || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return dateStr || "未填日期";
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return `${parts[1]}/${parts[2]} (${WEEKDAYS[d.getDay()]})`;
}

function formatMoney(n) {
  return `NT$ ${(Number(n) || 0).toLocaleString()}`;
}

// 品項摘要:「高麗菜、青蔥 等 3 項」
function itemSummary(items) {
  const names = (items || []).map((i) => i.name).filter(Boolean);
  if (names.length === 0) return "無品項";
  if (names.length <= 2) return names.join("、");
  return `${names.slice(0, 2).join("、")} 等 ${names.length} 項`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState(null); // null = 載入中
  const [error, setError] = useState("");
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
          setError("訂單載入失敗,請重新整理再試");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(order) {
    const ok = window.confirm(
      order.customerName
        ? `確定要刪除「${order.customerName}」這筆訂單嗎?`
        : "確定要刪除這筆待確認訂單嗎?"
    );
    if (!ok) return;
    setDeletingId(order._id);
    try {
      const res = await fetch(`/api/orders/${order._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("bad status");
      setOrders((prev) => prev.filter((o) => o._id !== order._id));
    } catch (_) {
      window.alert("刪除失敗,請稍後再試");
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
          <h1 className="page-title">訂單</h1>
        </div>
        <Link href="/orders/new" className="btn btn-primary">+ 新增訂單</Link>
      </header>

      {error && <p className="field-error">{error}</p>}

      {orders === null && <p className="text-muted mt-4">載入中…</p>}

      {orders !== null && orders.length === 0 && !error && (
        <div className="empty">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
              <path d="M8 7h8" />
              <path d="M8 11h8" />
            </svg>
          </div>
          <p className="empty-text">還沒有訂單</p>
          <p className="empty-hint">建立第一筆訂單,開始備貨吧</p>
          <Link href="/orders/new" className="btn btn-primary">新增訂單</Link>
        </div>
      )}

      {pendingOrders.length > 0 && (
        <section className="pending-section">
          <h2 className="group-title">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 12h-6l-2 3h-4l-2-3H2" />
              <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            </svg>
            待確認
            <span className="group-count">{pendingOrders.length} 筆</span>
          </h2>
          <div className="list">
            {pendingOrders.map((order) => (
              <div className="card pending-card" key={order._id}>
                <div className="row-between">
                  <span className="font-bold" style={{ fontSize: "var(--fs-lg)" }}>
                    {formatDateLabel(order.date)} 要貨
                  </span>
                  <span style={{ display: "flex", gap: "var(--space-2)" }}>
                    {order.source === "line" && <span className="badge badge-gray">LINE</span>}
                    <span className="badge badge-pending">待確認</span>
                  </span>
                </div>
                <div className="mt-2">
                  <div className="item-line">
                    <span>{itemSummary(order.items)}</span>
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
                    {deletingId === order._id ? "刪除中…" : "刪除"}
                  </button>
                  <Link href={`/orders/${order._id}/edit`} className="btn btn-primary">
                    確認訂單
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
              {formatDateLabel(group.date)}
              {group.date === today && <span className="badge badge-green">今天</span>}
              {group.date === tomorrow && <span className="badge badge-amber">明天</span>}
              <span className="group-count">
                {group.orders.length} 筆 · {formatMoney(dayTotal)}
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
                        已備 {preparedCount}/{items.length}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="item-line">
                        <span>{itemSummary(items)}</span>
                      </div>
                    </div>
                    <hr className="divider" />
                    <div className="row-between">
                      <span className="text-muted">合計</span>
                      <span className="amount-sm">{formatMoney(order.total)}</span>
                    </div>
                    <div className="btn-row mt-2">
                      <Link href={`/orders/${order._id}/receipt`} className="btn btn-ghost">
                        匯出
                      </Link>
                      <Link href={`/orders/${order._id}/edit`} className="btn btn-ghost">
                        編輯
                      </Link>
                      <button
                        type="button"
                        className="btn btn-ghost-danger"
                        disabled={deletingId === order._id}
                        onClick={() => handleDelete(order)}
                      >
                        {deletingId === order._id ? "刪除中…" : "刪除"}
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
