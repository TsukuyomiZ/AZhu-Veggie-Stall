"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 以店家(客戶)分組:一張卡一個店家,rows = 該店所有訂單的品項
function groupByStore(orders) {
  const map = new Map();
  for (const order of orders) {
    const key = String(order.customerId || order.customerName || order._id);
    if (!map.has(key)) {
      map.set(key, { key, name: order.customerName || "—", rows: [] });
    }
    const g = map.get(key);
    (order.items || []).forEach((item, itemIndex) => {
      g.rows.push({
        orderId: order._id,
        itemIndex,
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        prepared: !!item.prepared,
      });
    });
  }
  return Array.from(map.values()).filter((g) => g.rows.length > 0);
}

// 載入當下決定店家順序(未備完在前、已完成沉底),勾選過程不再重排
function sortedStoreKeys(orders) {
  const list = groupByStore(orders);
  list.sort((a, b) => {
    const aDone = a.rows.every((r) => r.prepared) ? 1 : 0;
    const bDone = b.rows.every((r) => r.prepared) ? 1 : 0;
    return aDone - bDone;
  });
  return list.map((g) => g.key);
}

function formatDateLabel(dateStr, t) {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const w = new Date(y, m - 1, d).getDay();
  return t("today.dateFormat", { m, d, w: t(`weekday.${w}`) });
}

export default function Page() {
  const { t } = useI18n();
  const [date, setDate] = useState(todayLocal);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  // 錯誤存布林,render 時才 t(),切語言時訊息會跟著換
  const [loadError, setLoadError] = useState(false);
  const [patchError, setPatchError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // 展開中的店家 key(預設全部收合)
  const [expanded, setExpanded] = useState(() => new Set());
  // 載入時定案的店家順序,勾選中不重排(避免卡片跳位置)
  const [storeOrder, setStoreOrder] = useState([]);
  const patchErrorTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetch(`/api/orders?date=${date}`)
      .then((res) => {
        if (!res.ok) throw new Error("load failed");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setOrders(list);
        setStoreOrder(sortedStoreKeys(list));
        setExpanded(new Set());
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
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

  const showPatchError = useCallback(() => {
    setPatchError(true);
    if (patchErrorTimer.current) clearTimeout(patchErrorTimer.current);
    patchErrorTimer.current = setTimeout(() => setPatchError(false), 4000);
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
          if (!res.ok) throw new Error("update failed");
        })
        .catch(() => {
          setPrepared(orderId, itemIndex, !nextPrepared);
          showPatchError();
        });
    },
    [setPrepared, showPatchError]
  );

  const toggleStore = useCallback((key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const groups = useMemo(() => {
    const list = groupByStore(orders);
    // 依載入時定案的順序排,勾選只改狀態不動位置
    const idx = new Map(storeOrder.map((k, i) => [k, i]));
    list.sort((a, b) => {
      const ai = idx.has(a.key) ? idx.get(a.key) : Infinity;
      const bi = idx.has(b.key) ? idx.get(b.key) : Infinity;
      return ai - bi;
    });
    return list;
  }, [orders, storeOrder]);

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
          <h1 className="page-title">{t("nav.today")}</h1>
          <p className="page-subtitle">{formatDateLabel(date, t)}</p>
        </div>
        <LangToggle compact />
      </header>

      <div className="field">
        <label className="field-label" htmlFor="prep-date">
          {t("today.pickDate")}
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

      {patchError ? (
        <p className="field-error mt-2">{t("today.patchError")}</p>
      ) : null}

      {loading ? (
        <p className="text-muted text-center mt-6">{t("common.loading")}</p>
      ) : loadError ? (
        <div className="empty mt-4">
          <p className="empty-text">{t("today.loadError")}</p>
          <button
            type="button"
            className="btn btn-primary mt-4"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            {t("today.reload")}
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
          <p className="empty-text">{t("today.emptyTitle")}</p>
          <p className="empty-hint">{t("today.emptyHint")}</p>
          <Link href="/orders/new" className="btn btn-primary">
            {t("today.emptyCta")}
          </Link>
        </div>
      ) : (
        <>
          <section className="summary-card mt-4">
            <p className="summary-title">
              {t("today.progressTitle", { n: totalRows })}
            </p>
            <div className="summary-nums">
              <div className="summary-num">
                <div className="summary-num-value">{preparedRows}</div>
                <div className="summary-num-label">{t("today.prepared")}</div>
              </div>
              <div className="summary-num">
                <div className="summary-num-value">{totalRows - preparedRows}</div>
                <div className="summary-num-label">{t("today.unprepared")}</div>
              </div>
              <div className="summary-num">
                <div className="summary-num-value">{totalRows}</div>
                <div className="summary-num-label">{t("today.totalItems")}</div>
              </div>
            </div>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${percent}%` }} />
            </div>
          </section>

          <div className="list mt-6">
            {groups.map((g, i) => {
              const preparedCount = g.rows.filter((r) => r.prepared).length;
              const done = preparedCount === g.rows.length;
              const open = expanded.has(g.key);
              const bodyId = `store-body-${i}`;
              return (
                <section className="store-card" key={g.key}>
                  <button
                    type="button"
                    className="store-head"
                    aria-expanded={open}
                    aria-controls={bodyId}
                    onClick={() => toggleStore(g.key)}
                  >
                    <span className="store-name">{g.name}</span>
                    <span
                      className={
                        done
                          ? "store-progress store-progress-done"
                          : "store-progress"
                      }
                    >
                      {t("today.storeProgress", {
                        prepared: preparedCount,
                        total: g.rows.length,
                      })}
                    </span>
                    <svg
                      className="store-chevron"
                      viewBox="0 0 24 24"
                      width="22"
                      height="22"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </button>
                  {open ? (
                    <div className="store-body" id={bodyId}>
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
                            <span className="check-name">{r.name}</span>
                            <span className="check-qty">
                              {r.qty} {r.unit}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
