"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const PERIODS = [
  { key: "week", label: "週" },
  { key: "month", label: "月" },
  { key: "quarter", label: "季" },
];

function pad(n) {
  return String(n).padStart(2, "0");
}
function fmtDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function money(n) {
  return `NT$ ${(Number(n) || 0).toLocaleString()}`;
}
// "2026-07-18" → "7/18 (六)"
function shortDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${m}/${d} (${WEEKDAYS[dt.getDay()]})`;
}

// 以本地時區計算本期/上期的日期區間
function getRange(period) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (period === "week") {
    const mon = addDays(now, -((now.getDay() + 6) % 7)); // 週一為一週開始
    const sun = addDays(mon, 6);
    return {
      from: fmtDate(mon),
      to: fmtDate(sun),
      prevFrom: fmtDate(addDays(mon, -7)),
      prevTo: fmtDate(addDays(mon, -1)),
      label: `${mon.getMonth() + 1}/${mon.getDate()} – ${sun.getMonth() + 1}/${sun.getDate()}`,
      thisName: "本週",
      prevName: "上週",
    };
  }
  if (period === "month") {
    return {
      from: fmtDate(new Date(y, m, 1)),
      to: fmtDate(new Date(y, m + 1, 0)),
      prevFrom: fmtDate(new Date(y, m - 1, 1)),
      prevTo: fmtDate(new Date(y, m, 0)),
      label: `${y} 年 ${m + 1} 月`,
      thisName: "本月",
      prevName: "上月",
    };
  }
  const q = Math.floor(m / 3);
  return {
    from: fmtDate(new Date(y, q * 3, 1)),
    to: fmtDate(new Date(y, q * 3 + 3, 0)),
    prevFrom: fmtDate(new Date(y, q * 3 - 3, 1)),
    prevTo: fmtDate(new Date(y, q * 3, 0)),
    label: `${y} 年第 ${q + 1} 季（${q * 3 + 1}–${q * 3 + 3} 月）`,
    thisName: "本季",
    prevName: "上一季",
  };
}

// 把 byDate 補滿成連續的長條資料
function buildBars(period, range, byDate) {
  const map = new Map(byDate.map((d) => [d.date, d]));
  const bars = [];
  const today = fmtDate(new Date());

  if (period === "quarter") {
    // 一根長條 = 一個月
    const [fy, fm] = range.from.split("-").map(Number);
    for (let i = 0; i < 3; i++) {
      const y = fy + Math.floor((fm - 1 + i) / 12);
      const mo = ((fm - 1 + i) % 12) + 1;
      const prefix = `${y}-${pad(mo)}`;
      let revenue = 0;
      let orders = 0;
      for (const d of byDate) {
        if (d.date.startsWith(prefix)) {
          revenue += d.revenue;
          orders += d.orders;
        }
      }
      bars.push({
        key: prefix,
        tick: `${mo}月`,
        detail: `${mo} 月`,
        revenue,
        orders,
        isNow: today.startsWith(prefix),
      });
    }
    return bars;
  }

  // 一根長條 = 一天
  let cursor = range.from;
  while (cursor <= range.to) {
    const [y, mo, dd] = cursor.split("-").map(Number);
    const dt = new Date(y, mo - 1, dd);
    const rec = map.get(cursor);
    bars.push({
      key: cursor,
      tick: period === "week" ? WEEKDAYS[dt.getDay()] : String(dd),
      detail: shortDate(cursor),
      revenue: rec ? rec.revenue : 0,
      orders: rec ? rec.orders : 0,
      isNow: cursor === today,
    });
    cursor = fmtDate(addDays(dt, 1));
  }
  return bars;
}

// 純 SVG 長條圖：單一系列（品牌綠），數值標籤用文字色
function BarChart({ bars, valueMode, tickEvery, selectedKey, onSelect }) {
  const W = 340;
  const H = 200;
  const top = 24; // 留給數值標籤
  const bottom = 26; // 留給 X 軸標籤
  const base = H - bottom;
  const max = Math.max(...bars.map((b) => b.revenue), 1);
  const slot = W / bars.length;
  const barW = Math.min(slot - 2, 40); // 長條之間至少 2px 間隔
  const r = Math.min(4, barW / 2); // 頂端圓角

  const peakKey = bars.reduce((best, b) => (b.revenue > best.revenue ? b : best), bars[0]).key;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="barchart"
      role="img"
      aria-label="營收長條圖"
    >
      {/* 淡色參考線 */}
      {[0.5, 1].map((f) => (
        <line
          key={f}
          x1="0"
          x2={W}
          y1={base - (base - top) * f}
          y2={base - (base - top) * f}
          className="barchart-grid"
        />
      ))}
      <line x1="0" x2={W} y1={base} y2={base} className="barchart-axis" />

      {bars.map((b, i) => {
        const h = b.revenue > 0 ? Math.max(((base - top) * b.revenue) / max, 3) : 0;
        const x = slot * i + (slot - barW) / 2;
        const yTop = base - h;
        const selected = selectedKey === b.key;
        const showValue =
          b.revenue > 0 && (valueMode === "all" || (valueMode === "peak" && b.key === peakKey));
        return (
          <g key={b.key} onClick={() => onSelect(selected ? null : b.key)}>
            {/* 放大點擊範圍 */}
            <rect x={slot * i} y={top} width={slot} height={base - top} fill="transparent" />
            {h > 0 && (
              <path
                d={`M ${x} ${base} L ${x} ${yTop + r} Q ${x} ${yTop} ${x + r} ${yTop} L ${
                  x + barW - r
                } ${yTop} Q ${x + barW} ${yTop} ${x + barW} ${yTop + r} L ${x + barW} ${base} Z`}
                className={
                  selected ? "barchart-bar selected" : b.isNow ? "barchart-bar now" : "barchart-bar"
                }
              />
            )}
            {showValue && (
              <text x={x + barW / 2} y={yTop - 6} textAnchor="middle" className="barchart-value">
                {b.revenue.toLocaleString()}
              </text>
            )}
            {(tickEvery === 1 || i % tickEvery === 0) && (
              <text
                x={slot * i + slot / 2}
                y={H - 8}
                textAnchor="middle"
                className={b.isNow ? "barchart-tick now" : "barchart-tick"}
              >
                {b.tick}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function StatsPage() {
  const [period, setPeriod] = useState("week");
  const [data, setData] = useState(null); // null = 載入中
  const [error, setError] = useState("");
  const [selectedKey, setSelectedKey] = useState(null);

  const range = useMemo(() => getRange(period), [period]);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError("");
    setSelectedKey(null);
    const qs = new URLSearchParams({
      from: range.from,
      to: range.to,
      prevFrom: range.prevFrom,
      prevTo: range.prevTo,
    });
    fetch(`/api/stats?${qs}`)
      .then((res) => {
        if (!res.ok) throw new Error("bad status");
        return res.json();
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError("統計載入失敗,請檢查網路後再試一次");
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const bars = useMemo(
    () => (data ? buildBars(period, range, data.byDate) : []),
    [data, period, range]
  );

  const selectedBar = bars.find((b) => b.key === selectedKey) || null;

  // 與上期比較的文字
  let compareText = "";
  if (data && data.prev) {
    if (data.prev.revenue > 0) {
      const diff = Math.round(((data.summary.revenue - data.prev.revenue) / data.prev.revenue) * 100);
      if (diff > 0) compareText = `比${range.prevName}成長 ${diff}%`;
      else if (diff < 0) compareText = `比${range.prevName}減少 ${-diff}%`;
      else compareText = `與${range.prevName}持平`;
    } else if (data.summary.revenue > 0) {
      compareText = `${range.prevName}沒有訂單`;
    }
  }

  // 文字摘要
  let summaryText = "";
  if (data && data.summary.orderCount > 0) {
    const parts = [
      `${range.thisName}（${range.label}）共 ${data.summary.orderCount} 筆訂單、${
        data.summary.customerCount
      } 位客戶，營收 ${money(data.summary.revenue)}`,
    ];
    if (compareText) parts.push(compareText);
    const topItem = data.byItem[0];
    if (topItem) {
      const qtyText = topItem.qty ? `共 ${topItem.qty.toLocaleString()} ${topItem.unit}、` : "";
      parts.push(`賣最好的是「${topItem.name}」（${qtyText}${money(topItem.amount)}）`);
    }
    const busiest = bars.reduce((best, b) => (b.revenue > best.revenue ? b : best), bars[0]);
    if (busiest && busiest.revenue > 0 && period !== "quarter") {
      parts.push(`營收最高的一天是 ${busiest.detail}，${money(busiest.revenue)}`);
    }
    summaryText = parts.join("；") + "。";
  }

  const maxItemAmount = data && data.byItem.length > 0 ? data.byItem[0].amount : 1;

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">銷量統計</h1>
          <p className="page-subtitle">{range.label}</p>
        </div>
      </header>

      <div className="segmented" role="tablist" aria-label="統計期間">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={period === p.key}
            className={period === p.key ? "segmented-btn active" : "segmented-btn"}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="empty mt-4">
          <p className="empty-text">{error}</p>
        </div>
      )}

      {!error && data === null && <p className="text-muted text-center mt-6">載入中…</p>}

      {!error && data !== null && data.summary.orderCount === 0 && (
        <div className="empty mt-4">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <rect x="7" y="12" width="3" height="6" rx="1" />
              <rect x="12" y="8" width="3" height="10" rx="1" />
              <rect x="17" y="5" width="3" height="13" rx="1" />
            </svg>
          </div>
          <p className="empty-text">{range.thisName}還沒有訂單</p>
          <p className="empty-hint">有訂單之後,這裡會顯示營收和品項統計</p>
          <Link href="/orders/new" className="btn btn-primary">新增訂單</Link>
        </div>
      )}

      {!error && data !== null && data.summary.orderCount > 0 && (
        <div className="stack-4 mt-4">
          {/* 摘要卡 */}
          <div className="summary-card">
            <div className="summary-title">{range.thisName}營收</div>
            <div className="summary-nums">
              <div className="summary-num">
                <div className="summary-num-value">{money(data.summary.revenue)}</div>
                <div className="summary-num-label">
                  {data.summary.orderCount} 筆訂單 · {data.summary.customerCount} 位客戶
                </div>
              </div>
            </div>
            {compareText && <span className="badge badge-green mt-2">{compareText}</span>}
          </div>

          {/* 文字摘要 */}
          {summaryText && (
            <div className="card">
              <p className="stats-summary-text">{summaryText}</p>
            </div>
          )}

          {/* 營收圖表 */}
          <div className="card">
            <h2 className="stats-card-title">
              {period === "quarter" ? "每月營收" : "每日營收"}
            </h2>
            <BarChart
              bars={bars}
              valueMode={period === "month" ? "peak" : "all"}
              tickEvery={period === "month" ? 5 : 1}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
            />
            <p className="stats-chart-note">
              {selectedBar
                ? `${selectedBar.detail}：${money(selectedBar.revenue)} · ${selectedBar.orders} 筆訂單`
                : "點一下長條可以看當天的金額"}
            </p>
          </div>

          {/* 品項排行 */}
          <div className="card">
            <h2 className="stats-card-title">品項排行（依金額）</h2>
            <div className="rank-list">
              {data.byItem.map((item, i) => (
                <div className="rank-row" key={`${item.name}|${item.unit}`}>
                  <div className="rank-head">
                    <span className="rank-name">
                      {i + 1}. {item.name}
                    </span>
                    <span className="rank-value">
                      {item.qty ? `${item.qty.toLocaleString()} ${item.unit} · ` : ""}
                      {money(item.amount)}
                    </span>
                  </div>
                  <div className="rank-bar">
                    <div
                      className="rank-bar-fill"
                      style={{ width: `${Math.max((item.amount / maxItemAmount) * 100, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 客戶排行 */}
          <div className="card">
            <h2 className="stats-card-title">客戶排行</h2>
            <div className="list">
              {data.byCustomer.map((c, i) => (
                <div className="row-between rank-customer" key={c.name || i}>
                  <span>
                    {i + 1}. {c.name || "（未填客戶）"}
                    <span className="text-muted text-sm"> · {c.orders} 筆</span>
                  </span>
                  <span className="amount-sm">{money(c.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
