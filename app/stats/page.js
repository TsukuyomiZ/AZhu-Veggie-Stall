"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

const PERIODS = [
  { key: "week", labelKey: "stats.week" },
  { key: "month", labelKey: "stats.month" },
  { key: "quarter", labelKey: "stats.quarter" },
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
// "2026-07-18" → 中文 "7/18 (六)" / 越文 "18/7 (T7)"(格式與星期都走字典)
function shortDate(dateStr, t) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return t("stats.shortDate", { m, d, w: t(`weekday.${dt.getDay()}`) });
}

// 以本地時區計算本期/上期的日期區間。
// 顯示文字(期間標題、本期/上期名稱)只回 key + 變數,由畫面層 t() 組句,
// 因為中越語序不同(7/18 vs 18/7、{y}年{m}月 vs Tháng {m}/{y})。
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
      labelKey: "stats.weekLabel",
      labelVars: {
        m1: mon.getMonth() + 1,
        d1: mon.getDate(),
        m2: sun.getMonth() + 1,
        d2: sun.getDate(),
      },
      thisKey: "stats.thisWeek",
      prevKey: "stats.lastWeek",
    };
  }
  if (period === "month") {
    return {
      from: fmtDate(new Date(y, m, 1)),
      to: fmtDate(new Date(y, m + 1, 0)),
      prevFrom: fmtDate(new Date(y, m - 1, 1)),
      prevTo: fmtDate(new Date(y, m, 0)),
      labelKey: "stats.monthLabel",
      labelVars: { y, m: m + 1 },
      thisKey: "stats.thisMonth",
      prevKey: "stats.lastMonth",
    };
  }
  const q = Math.floor(m / 3);
  return {
    from: fmtDate(new Date(y, q * 3, 1)),
    to: fmtDate(new Date(y, q * 3 + 3, 0)),
    prevFrom: fmtDate(new Date(y, q * 3 - 3, 1)),
    prevTo: fmtDate(new Date(y, q * 3, 0)),
    labelKey: "stats.quarterLabel",
    labelVars: { y, q: q + 1, m1: q * 3 + 1, m2: q * 3 + 3 },
    thisKey: "stats.thisQuarter",
    prevKey: "stats.lastQuarter",
  };
}

// 把 byDate 補滿成連續的長條資料(tick/detail 是顯示文字,需要 t)
function buildBars(period, range, byDate, t) {
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
        tick: t("stats.monthTick", { n: mo }),
        detail: t("stats.monthDetail", { n: mo }),
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
      tick: period === "week" ? t(`weekday.${dt.getDay()}`) : String(dd),
      detail: shortDate(cursor, t),
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
  const { t } = useI18n();
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
      aria-label={t("stats.chartAria")}
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
  const { t } = useI18n();
  const [period, setPeriod] = useState("week");
  const [data, setData] = useState(null); // null = 載入中
  const [error, setError] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);

  const range = useMemo(() => getRange(period), [period]);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(false);
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
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const bars = useMemo(
    () => (data ? buildBars(period, range, data.byDate, t) : []),
    [data, period, range, t]
  );

  const selectedBar = bars.find((b) => b.key === selectedKey) || null;

  const thisName = t(range.thisKey);
  const prevName = t(range.prevKey);

  // 與上期比較：tone 決定 badge 顏色
  let compare = null; // { text, tone: "up" | "down" | "flat" | "none" }
  if (data && data.prev) {
    if (data.prev.revenue > 0) {
      const diff = Math.round(((data.summary.revenue - data.prev.revenue) / data.prev.revenue) * 100);
      if (diff > 0)
        compare = { text: t("stats.compareUp", { period: prevName, n: diff }), tone: "up" };
      else if (diff < 0)
        compare = { text: t("stats.compareDown", { period: prevName, n: -diff }), tone: "down" };
      else compare = { text: t("stats.compareFlat", { period: prevName }), tone: "flat" };
    } else if (data.summary.revenue > 0) {
      compare = { text: t("stats.comparePrevEmpty", { period: prevName }), tone: "none" };
    }
  }
  const compareBadgeClass =
    compare?.tone === "up"
      ? "badge badge-green"
      : compare?.tone === "down"
        ? "badge badge-red"
        : "badge badge-gray";

  const topItem = data && data.byItem.length > 0 ? data.byItem[0] : null;
  const busiestBar =
    bars.length > 0 ? bars.reduce((best, b) => (b.revenue > best.revenue ? b : best), bars[0]) : null;
  const maxItemAmount = topItem ? topItem.amount : 1;

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">{t("stats.title")}</h1>
          <p className="page-subtitle">{t(range.labelKey, range.labelVars)}</p>
        </div>
      </header>

      <div className="segmented" role="tablist" aria-label={t("stats.periodAria")}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={period === p.key}
            className={period === p.key ? "segmented-btn active" : "segmented-btn"}
            onClick={() => setPeriod(p.key)}
          >
            {t(p.labelKey)}
          </button>
        ))}
      </div>

      {error && (
        <div className="empty mt-4">
          <p className="empty-text">{t("stats.loadError")}</p>
        </div>
      )}

      {!error && data === null && (
        <p className="text-muted text-center mt-6">{t("common.loading")}</p>
      )}

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
          <p className="empty-text">{t("stats.emptyText", { period: thisName })}</p>
          <p className="empty-hint">{t("stats.emptyHint")}</p>
          <Link href="/orders/new" className="btn btn-primary">{t("stats.newOrder")}</Link>
        </div>
      )}

      {!error && data !== null && data.summary.orderCount > 0 && (
        <div className="stack-4 mt-4">
          {/* 摘要卡 */}
          <div className="summary-card">
            <div className="summary-title">{t("stats.revenueTitle", { period: thisName })}</div>
            <div className="summary-nums">
              <div className="summary-num">
                <div className="summary-num-value">{money(data.summary.revenue)}</div>
                <div className="summary-num-label">
                  {t("stats.summarySub", {
                    orders: data.summary.orderCount,
                    customers: data.summary.customerCount,
                  })}
                </div>
              </div>
            </div>
            {compare && <span className={`${compareBadgeClass} mt-2`}>{compare.text}</span>}
          </div>

          {/* 重點摘要 */}
          <div className="card">
            <div className="stat-lines">
              <div className="stat-line">
                <span className="stat-line-label">{t("stats.lineOrders")}</span>
                <span className="stat-line-value">
                  <strong className="stat-em">{data.summary.orderCount}</strong>{" "}
                  {t("stats.unitOrders")} ·{" "}
                  <strong className="stat-em">{data.summary.customerCount}</strong>{" "}
                  {t("stats.unitCustomers")}
                </span>
              </div>
              {compare && (
                <div className="stat-line">
                  <span className="stat-line-label">{t("stats.lineTrend")}</span>
                  <span className="stat-line-value">
                    <span className={compareBadgeClass}>{compare.text}</span>
                  </span>
                </div>
              )}
              {topItem && (
                <div className="stat-line">
                  <span className="stat-line-label">{t("stats.lineTopItem")}</span>
                  <span className="stat-line-value">
                    <span className="stat-item-name">{topItem.name}</span>
                    {topItem.qty ? (
                      <>
                        {" "}
                        {t("stats.qtyPrefix")}{" "}
                        <strong className="stat-em">{topItem.qty.toLocaleString()}</strong>{" "}
                        {topItem.unit}
                      </>
                    ) : null}{" "}
                    · <strong className="stat-em">{money(topItem.amount)}</strong>
                  </span>
                </div>
              )}
              {busiestBar && busiestBar.revenue > 0 && (
                <div className="stat-line">
                  <span className="stat-line-label">
                    {period === "quarter"
                      ? t("stats.lineBusiestMonth")
                      : t("stats.lineBusiestDay")}
                  </span>
                  <span className="stat-line-value">
                    {busiestBar.detail} ·{" "}
                    <strong className="stat-em">{money(busiestBar.revenue)}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 營收圖表 */}
          <div className="card">
            <h2 className="stats-card-title">
              {period === "quarter" ? t("stats.chartTitleMonthly") : t("stats.chartTitleDaily")}
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
                ? t("stats.chartDetail", {
                    detail: selectedBar.detail,
                    money: money(selectedBar.revenue),
                    n: selectedBar.orders,
                  })
                : t("stats.chartHint")}
            </p>
          </div>

          {/* 品項排行 */}
          <div className="card">
            <h2 className="stats-card-title">{t("stats.itemRankTitle")}</h2>
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
            <h2 className="stats-card-title">{t("stats.customerRankTitle")}</h2>
            <div className="list">
              {data.byCustomer.map((c, i) => (
                <div className="row-between rank-customer" key={c.name || i}>
                  <span>
                    {i + 1}. {c.name || t("stats.noCustomer")}
                    <span className="text-muted text-sm">
                      {" "}
                      · {t("stats.nOrders", { n: c.orders })}
                    </span>
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
