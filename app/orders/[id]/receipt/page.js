"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";

// 單據內容(Canvas 圖與頁面預覽)是給客人的正式單據,維持中文不隨介面語言變,
// 所以這裡的星期/文案不走字典
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const FONT = '"PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif';

// "2026-07-21" → "2026/7/21 (星期二)"
function formatFullDate(dateStr) {
  const parts = (dateStr || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return dateStr || "未填日期";
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return `${parts[0]}/${parts[1]}/${parts[2]} (星期${WEEKDAYS[d.getDay()]})`;
}

function formatMoney(n) {
  return `NT$ ${(Number(n) || 0).toLocaleString()}`;
}

// 過長文字裁切成「…」，避免超出畫布
function truncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

// 把訂單畫成一張單據圖片，回傳 canvas
function drawReceipt(order) {
  const scale = 3; // 高解析度，LINE 上放大也清楚
  const W = 360;
  const P = 24;
  const items = order.items || [];
  const rowH = 34;

  const headerH = 118; // 店名 + 副標 + 分隔線
  const metaH = 62; // 客戶 + 日期
  const tableHeadH = 34;
  const totalH = 64;
  const footerH = 48;
  const H = headerH + metaH + tableHeadH + items.length * rowH + totalH + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  // 白底
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  const green = "#2b8a3e";
  const ink = "#1e2b20";
  const muted = "#4d5c50";
  const border = "#dbe4d9";

  let y = 44;

  // 店名
  ctx.fillStyle = green;
  ctx.font = `800 26px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("阿珠菜攤", W / 2, y);

  // 副標(手動加空格代替 letter-spacing,相容性最好)
  y += 28;
  ctx.fillStyle = muted;
  ctx.font = `400 13px ${FONT}`;
  ctx.fillText("訂 購 單 據", W / 2, y);

  // 綠色分隔線
  y += 20;
  ctx.strokeStyle = green;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(P, y);
  ctx.lineTo(W - P, y);
  ctx.stroke();

  // 客戶、訂單日期
  y += 30;
  ctx.textAlign = "left";
  ctx.fillStyle = muted;
  ctx.font = `400 14px ${FONT}`;
  ctx.fillText("客戶", P, y);
  ctx.textAlign = "right";
  ctx.fillStyle = ink;
  ctx.font = `700 16px ${FONT}`;
  ctx.fillText(truncate(ctx, order.customerName || "", W - P * 2 - 50), W - P, y);

  y += 26;
  ctx.textAlign = "left";
  ctx.fillStyle = muted;
  ctx.font = `400 14px ${FONT}`;
  ctx.fillText("訂單日期", P, y);
  ctx.textAlign = "right";
  ctx.fillStyle = ink;
  ctx.font = `700 16px ${FONT}`;
  ctx.fillText(formatFullDate(order.date), W - P, y);

  // 表頭
  y += 32;
  const qtyRight = W - P - 96; // 數量欄右緣
  ctx.fillStyle = muted;
  ctx.font = `700 12px ${FONT}`;
  ctx.textAlign = "left";
  ctx.fillText("品項", P, y);
  ctx.textAlign = "right";
  ctx.fillText("數量", qtyRight, y);
  ctx.fillText("金額", W - P, y);

  y += 10;
  ctx.strokeStyle = "#b7c6b6";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(P, y);
  ctx.lineTo(W - P, y);
  ctx.stroke();

  // 品項列
  for (const item of items) {
    y += rowH;
    const textY = y - 12;
    ctx.fillStyle = ink;
    ctx.font = `400 15px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(truncate(ctx, item.name || "", 130), P, textY);
    ctx.textAlign = "right";
    const qtyText = item.qty ? `${item.qty} ${item.unit || ""}`.trim() : item.unit || "—";
    ctx.fillText(qtyText, qtyRight, textY);
    ctx.fillText(formatMoney(item.amount), W - P, textY);
    ctx.strokeStyle = border;
    ctx.beginPath();
    ctx.moveTo(P, y);
    ctx.lineTo(W - P, y);
    ctx.stroke();
  }

  // 總額
  y += 42;
  ctx.fillStyle = ink;
  ctx.font = `700 16px ${FONT}`;
  ctx.textAlign = "left";
  ctx.fillText("總額", P, y);
  ctx.fillStyle = green;
  ctx.font = `800 24px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText(formatMoney(order.total), W - P, y);

  // 頁尾
  y += 36;
  ctx.fillStyle = muted;
  ctx.font = `400 12px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("感謝惠顧", W / 2, y);

  return canvas;
}

async function receiptImageFile(order) {
  const canvas = drawReceipt(order);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const name = `訂購單據-${order.customerName || "客戶"}-${order.date || ""}.png`;
  return new File([blob], name, { type: "image/png" });
}

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function ReceiptPage() {
  const { id } = useParams();
  const { t } = useI18n();
  const [order, setOrder] = useState(null); // null = 載入中
  const [error, setError] = useState(""); // 存字典 key,render 時才 t()
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(""); // 同上,存字典 key

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`/api/orders/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("bad status");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch(() => {
        if (!cancelled) setError("receipt.loadFailed");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleShare() {
    if (!order) return;
    setBusy(true);
    setNotice("");
    try {
      const file = await receiptImageFile(order);
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "訂購單據" });
        } catch (err) {
          // 使用者自己取消分享面板不算錯誤
          if (err && err.name !== "AbortError") {
            downloadFile(file);
            setNotice("receipt.shareFallback");
          }
        }
      } else {
        downloadFile(file);
        setNotice("receipt.noShareSupport");
      }
    } catch (_) {
      setNotice("receipt.genFailed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    if (!order) return;
    setBusy(true);
    setNotice("");
    try {
      downloadFile(await receiptImageFile(order));
    } catch (_) {
      setNotice("receipt.genFailed");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="empty mt-6">
        <p className="empty-text">{t(error)}</p>
        <Link href="/orders" className="btn btn-primary mt-4">{t("orders.backToList")}</Link>
      </div>
    );
  }

  if (order === null) {
    return <p className="text-muted text-center mt-6">{t("common.loading")}</p>;
  }

  const items = order.items || [];

  return (
    <>
      <header className="page-header no-print">
        <div>
          <h1 className="page-title">{t("receipt.pageTitle")}</h1>
          <p className="page-subtitle">{order.customerName}</p>
        </div>
      </header>

      <div className="receipt" id="receipt">
        <div className="receipt-header">
          <div className="receipt-brand">阿珠菜攤</div>
          <div className="receipt-doc-title">訂購單據</div>
        </div>

        <div className="receipt-meta">
          <div className="receipt-meta-row">
            <span className="receipt-meta-label">客戶</span>
            <span className="receipt-meta-value">{order.customerName}</span>
          </div>
          <div className="receipt-meta-row">
            <span className="receipt-meta-label">訂單日期</span>
            <span className="receipt-meta-value">{formatFullDate(order.date)}</span>
          </div>
        </div>

        <table className="receipt-table">
          <thead>
            <tr>
              <th>品項</th>
              <th className="receipt-col-qty">數量</th>
              <th className="receipt-col-amount">金額</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td>{item.name}</td>
                <td className="receipt-col-qty">
                  {item.qty ? `${item.qty} ${item.unit}`.trim() : item.unit || "—"}
                </td>
                <td className="receipt-col-amount">{formatMoney(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="receipt-total">
          <span>總額</span>
          <span className="receipt-total-amount">{formatMoney(order.total)}</span>
        </div>

        <p className="receipt-footer">感謝惠顧</p>
      </div>

      <div className="btn-row mt-4 no-print">
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={handleDownload}>
          {t("receipt.download")}
        </button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={handleShare}>
          {busy ? t("receipt.busy") : t("receipt.share")}
        </button>
      </div>
      {notice && <p className="field-error text-center mt-2 no-print">{t(notice)}</p>}
      <p className="text-muted text-sm text-center mt-2 no-print">
        {t("receipt.shareHint")}
      </p>
      <div className="text-center mt-2 no-print">
        <Link href="/orders" className="btn btn-ghost">{t("orders.backToList")}</Link>
      </div>
    </>
  );
}
