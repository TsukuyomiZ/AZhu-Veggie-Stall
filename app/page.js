"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const week = ["日", "一", "二", "三", "四", "五", "六"];
  const w = new Date(y, m - 1, d).getDay();
  return `${m}月${d}日(星期${week[w]})`;
}

export default function Page() {
  const [date, setDate] = useState(todayLocal);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [patchError, setPatchError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const patchErrorTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    fetch(`/api/orders?date=${date}`)
      .then((res) => {
        if (!res.ok) throw new Error("載入失敗");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("載入訂單失敗,請檢查網路後再試一次。");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, reloadKey]);

  useEffect(() => {
    return () => {
      if (patchErrorTimer.current) clearTimeout(patchErrorTimer.current);
    };
  }, []);

  const showPatchError = useCallback((msg) => {
    setPatchError(msg);
    if (patchErrorTimer.current) clearTimeout(patchErrorTimer.current);
    patchErrorTimer.current = setTimeout(() => setPatchError(""), 4000);
  }, []);

  const setPrepared = useCallback((orderId, itemIndex, prepared) => {
    setOrders((prev) =>
      prev.map((o) =>
        o._id === orderId
          ? {
              ...o,
              items: o.items.map((it, i) =>
                i === itemIndex ? { ...it, prepared } : it
              ),
            }
          : o
      )
    );
  }, []);

  const toggleItem = useCallback(
    (orderId, itemIndex, nextPrepared) => {
      setPrepared(orderId, itemIndex, nextPrepared);
      fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIndex, prepared: nextPrepared }),
      })
        .then((res) => {
          if (!res.ok) throw new Error("更新失敗");
        })
        .catch(() => {
          setPrepared(orderId, itemIndex, !nextPrepared);
          showPatchError("勾選沒有存成功,已恢復原狀,請再試一次。");
        });
    },
    [setPrepared, showPatchError]
  );

  const groups = useMemo(() => {
    const map = new Map();
    for (const order of orders) {
      (order.items || []).forEach((item, itemIndex) => {
        const key = `${item.name}|${item.unit}`;
        if (!map.has(key)) {
          map.set(key, {
            key,
            name: item.name,
            unit: item.unit,
            totalQty: 0,
            preparedQty: 0,
            rows: [],
          });
        }
        const g = map.get(key);
        g.totalQty += item.qty;
        if (item.prepared) g.preparedQty += item.qty;
        g.rows.push({
          orderId: order._id,
          itemIndex,
          customerName: order.customerName,
          qty: item.qty,
          prepared: !!item.prepared,
        });
      });
    }
    const list = Array.from(map.values());
    list.sort((a, b) => {
      const aDone = a.rows.every((r) => r.prepared) ? 1 : 0;
      const bDone = b.rows.every((r) => r.prepared) ? 1 : 0;
      return aDone - bDone;
    });
    return list;
  }, [orders]);

  const totalRows = groups.reduce((n, g) => n + g.rows.length, 0);
  const preparedRows = groups.reduce(
    (n, g) => n + g.rows.filter((r) => r.prepared).length,
    0
  );
  const percent = totalRows === 0 ? 0 : Math.round((preparedRows / totalRows) * 100);

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">今日備貨</h1>
          <p className="page-subtitle">{formatDateLabel(date)}</p>
        </div>
      </header>

      <div className="field">
        <label className="field-label" htmlFor="prep-date">
          選擇日期
        </label>
        <input
          className="input"
          id="prep-date"
          type="date"
          value={date}
          onChange={(e) => {
            // 手機上日期可被清空，空值時保持原日期，避免載入全部訂單
            if (e.target.value) setDate(e.target.value);
          }}
        />
      </div>

      {patchError ? <p className="field-error mt-2">{patchError}</p> : null}

      {loading ? (
        <p className="text-muted text-center mt-6">載入中…</p>
      ) : loadError ? (
        <div className="empty mt-4">
          <p className="empty-text">{loadError}</p>
          <button
            type="button"
            className="btn btn-primary mt-4"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            重新載入
          </button>
        </div>
      ) : totalRows === 0 ? (
        <div className="empty mt-4">
          <div className="empty-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
              <path d="M8 7h8" />
              <path d="M8 11h8" />
            </svg>
          </div>
          <p className="empty-text">這一天沒有訂單</p>
          <p className="empty-hint">先新增訂單,才有備貨清單</p>
          <Link href="/orders/new" className="btn btn-primary">
            去新增訂單
          </Link>
        </div>
      ) : (
        <>
          <section className="summary-card mt-4">
            <p className="summary-title">備貨進度 — 總品項 {totalRows} 項</p>
            <div className="summary-nums">
              <div className="summary-num">
                <div className="summary-num-value">{preparedRows}</div>
                <div className="summary-num-label">已備</div>
              </div>
              <div className="summary-num">
                <div className="summary-num-value">{totalRows - preparedRows}</div>
                <div className="summary-num-label">未備</div>
              </div>
              <div className="summary-num">
                <div className="summary-num-value">{totalRows}</div>
                <div className="summary-num-label">總品項</div>
              </div>
            </div>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${percent}%` }} />
            </div>
          </section>

          <div className="stack-4 mt-6">
            {groups.map((g) => {
              const done = g.rows.every((r) => r.prepared);
              return (
                <section className="date-group" key={g.key}>
                  <h2 className="group-title">
                    {g.name}
                    <span className="group-count">
                      已備 {g.preparedQty} / {g.totalQty} {g.unit}
                    </span>
                    {done ? <span className="badge badge-green">完成</span> : null}
                  </h2>
                  <div className="check-group">
                    {g.rows.map((r) => (
                      <label
                        className="check-row"
                        key={`${r.orderId}-${r.itemIndex}`}
                      >
                        <input
                          type="checkbox"
                          checked={r.prepared}
                          onChange={() =>
                            toggleItem(r.orderId, r.itemIndex, !r.prepared)
                          }
                        />
                        <span className="check-box" aria-hidden="true">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m5 13 4 4 10-10" />
                          </svg>
                        </span>
                        <span className="check-name">{r.customerName}</span>
                        <span className="check-qty">
                          {r.qty} {g.unit}
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
