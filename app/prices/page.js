"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

const EMPTY_FORM = { name: "", unit: "", price: "" };

// 把價錢 token 轉成數字:允許「元」「塊」「$」「NT$」前後綴,去掉後必須是純數字
// 轉不成 → null
function parsePriceToken(token) {
  const stripped = token
    .replace(/^(?:NT\$|\$)/i, "")
    .replace(/(?:元|塊)$/, "");
  if (!/^\d+(?:\.\d+)?$/.test(stripped)) return null;
  return Number(stripped);
}

// 解析一行匯入文字:以空白/逗號/頓號/Tab 切 token;
// 最後一個能轉成數字的 token = 單價,第一個 token = 品項名,
// 中間剩餘的非數字 token(若有)= 單位。
// 沒有價錢、或整行只有價錢沒有品項名 → { invalid: true }
function parseImportLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const tokens = trimmed.split(/[\s,，、\t]+/).filter(Boolean);
  let priceIdx = -1;
  let price = null;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const p = parsePriceToken(tokens[i]);
    if (p !== null) {
      priceIdx = i;
      price = p;
      break;
    }
  }
  if (priceIdx <= 0) {
    return { raw: trimmed, invalid: true };
  }
  const unit = tokens
    .slice(1)
    .filter((t, idx) => idx + 1 !== priceIdx && parsePriceToken(t) === null)
    .join(" ");
  return { name: tokens[0], unit, price, invalid: false };
}

export default function PricesPage() {
  const { t } = useI18n();

  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  // 用 boolean 記錯誤,render 時才 t(),切語言後訊息會跟著換
  const [loadError, setLoadError] = useState(false);

  // editing: null = 沒開表單;"new" = 新增;其他 = 編輯中價目的 _id
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [nameError, setNameError] = useState(false);
  const [priceError, setPriceError] = useState(false);
  // formError:{ text } = 伺服器原文照樣顯示(不翻譯);{ key } = 前端字典訊息,
  // render 時才 t(),錯誤顯示期間切語言會跟著換
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  // 批次匯入
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState(null); // null = 還沒解析
  const [importBusy, setImportBusy] = useState(false);
  // 進度與結果都存結構化資料,render 時才組句(切語言即時更新)
  const [importProgress, setImportProgress] = useState(null); // { i, total }
  const [importResult, setImportResult] = useState(null); // { ok, skip }

  async function fetchPrices() {
    try {
      setLoadError(false);
      const res = await fetch("/api/prices");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPrices(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPrices();
  }, []);

  function openNew() {
    setEditing("new");
    setForm(EMPTY_FORM);
    setNameError(false);
    setPriceError(false);
    setFormError(null);
  }

  function openEdit(p) {
    setEditing(p._id);
    setForm({
      name: p.name || "",
      unit: p.unit || "",
      price: p.price != null ? String(p.price) : "",
    });
    setNameError(false);
    setPriceError(false);
    setFormError(null);
  }

  function closeForm() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setNameError(false);
    setPriceError(false);
    setFormError(null);
  }

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "name" && value.trim()) setNameError(false);
    if (key === "price" && value.trim()) setPriceError(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    const priceNum = Number(form.price);
    const priceOk =
      form.price.trim() !== "" && Number.isFinite(priceNum) && priceNum >= 0;
    if (!form.name.trim() || !priceOk) {
      setNameError(!form.name.trim());
      setPriceError(!priceOk);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const isNew = editing === "new";
      const res = await fetch(
        isNew ? "/api/prices" : `/api/prices/${editing}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            unit: form.unit.trim(),
            price: priceNum,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // 伺服器有給錯誤訊息就照原樣顯示(不翻譯),沒有才用前端的字典訊息
        const err = new Error("save-failed");
        err.info = data.error ? { text: data.error } : { key: "prices.saveFailed" };
        throw err;
      }
      closeForm();
      await fetchPrices();
    } catch (err) {
      setFormError(err.info || { key: "prices.saveFailed" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p) {
    if (!window.confirm(t("prices.deleteConfirm", { name: p.name }))) return;
    try {
      const res = await fetch(`/api/prices/${p._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      if (editing === p._id) closeForm();
      await fetchPrices();
    } catch {
      window.alert(t("prices.deleteFailed"));
    }
  }

  function closeImport() {
    setImportOpen(false);
    setImportText("");
    setImportPreview(null);
    setImportProgress(null);
  }

  function parsePreview() {
    const rows = importText
      .split(/\r?\n/)
      .map(parseImportLine)
      .filter(Boolean)
      .map((row) =>
        row.invalid
          ? row
          : { ...row, exists: prices.some((p) => p.name === row.name) }
      );
    setImportPreview(rows);
  }

  async function runImport() {
    if (!importPreview) return;
    const rows = importPreview.filter((r) => !r.invalid && !r.exists);
    if (rows.length === 0) return;
    let skip = importPreview.length - rows.length;
    setImportBusy(true);
    let ok = 0;
    for (let i = 0; i < rows.length; i++) {
      setImportProgress({ i: i + 1, total: rows.length });
      try {
        const res = await fetch("/api/prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: rows[i].name,
            unit: rows[i].unit,
            price: rows[i].price,
          }),
        });
        if (!res.ok) throw new Error();
        ok++;
      } catch {
        skip++;
      }
    }
    await fetchPrices();
    setImportResult({ ok, skip });
    setImportBusy(false);
    closeImport();
  }

  function renderImportPanel() {
    const newRows = importPreview
      ? importPreview.filter((r) => !r.invalid && !r.exists)
      : [];
    return (
      <div className="card mt-2">
        {importPreview === null ? (
          <>
            <div className="field">
              <label className="field-label" htmlFor="import-text">
                {t("prices.importLabel")}
              </label>
              <textarea
                className="textarea"
                id="import-text"
                rows={6}
                placeholder={t("prices.importPlaceholder")}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
            </div>
            <div className="btn-row mt-2">
              <button type="button" className="btn btn-ghost" onClick={closeImport}>
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!importText.trim()}
                onClick={parsePreview}
              >
                {t("prices.parsePreview")}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="font-bold">
              {t("prices.importParsed", { n: importPreview.length })}
              {importPreview.length - newRows.length > 0 &&
                t("prices.importParsedSkip", {
                  n: importPreview.length - newRows.length,
                })}
            </p>
            <div className="mt-2">
              {importPreview.map((r, i) =>
                r.invalid ? (
                  <div className="import-row" key={i}>
                    <span className="text-muted">{r.raw}</span>
                    <span className="badge badge-amber">
                      {t("prices.invalidBadge")}
                    </span>
                  </div>
                ) : (
                  <div className="import-row" key={i}>
                    <span className={r.exists ? "text-muted" : "font-bold"}>
                      {r.name}
                    </span>
                    <span className="import-row-sub">
                      {[r.unit, `NT$ ${r.price.toLocaleString()}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {r.exists && (
                      <span className="badge badge-gray">
                        {t("prices.existsBadge")}
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
            {importProgress && (
              <p className="text-muted text-sm mt-2">
                {t("prices.importProgress", importProgress)}
              </p>
            )}
            <div className="btn-row mt-4">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={importBusy}
                onClick={() => setImportPreview(null)}
              >
                {t("prices.backEdit")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={importBusy || newRows.length === 0}
                onClick={runImport}
              >
                {importBusy
                  ? t("prices.importing")
                  : t("prices.confirmImport", { n: newRows.length })}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  function renderForm() {
    return (
      <form className="card" onSubmit={handleSave}>
        <div className="field">
          <label className="field-label" htmlFor="price-name">
            {t("prices.name")}
          </label>
          <input
            className={nameError ? "input input-error" : "input"}
            id="price-name"
            type="text"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
          />
          {nameError && <p className="field-error">{t("prices.nameRequired")}</p>}
        </div>
        <div className="form-row">
          <div className="field">
            <label className="field-label" htmlFor="price-unit">
              {t("prices.unit")}
            </label>
            <input
              className="input"
              id="price-unit"
              type="text"
              placeholder={t("prices.unitPlaceholder")}
              value={form.unit}
              onChange={(e) => setField("unit", e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="price-price">
              {t("prices.price")}
            </label>
            <input
              className={priceError ? "input input-error" : "input"}
              id="price-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={form.price}
              onChange={(e) => setField("price", e.target.value)}
            />
            {priceError && (
              <p className="field-error">{t("prices.priceRequired")}</p>
            )}
          </div>
        </div>
        {formError && (
          <p className="field-error">{formError.text || t(formError.key)}</p>
        )}
        <div className="btn-row mt-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={closeForm}
            disabled={saving}
          >
            {t("common.cancel")}
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? t("prices.saving") : t("common.save")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">{t("prices.title")}</h1>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={openNew}
          disabled={editing === "new"}
        >
          {t("prices.addNew")}
        </button>
      </header>

      {editing !== "new" && !importOpen && (
        <button
          type="button"
          className="btn btn-ghost btn-block mt-2"
          onClick={() => {
            setImportOpen(true);
            setImportResult(null);
          }}
        >
          {t("prices.batchImport")}
        </button>
      )}

      {importResult && (
        <p className="field-hint text-center mt-2">
          {t("prices.importDone", importResult)}
        </p>
      )}

      {importOpen && renderImportPanel()}

      {editing === "new" && <div className="mt-2">{renderForm()}</div>}

      {loading ? (
        <p className="text-muted text-center mt-6">{t("common.loading")}</p>
      ) : loadError ? (
        <div className="empty">
          <p className="empty-text">{t("prices.loadError")}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setLoading(true);
              fetchPrices();
            }}
          >
            {t("common.retry")}
          </button>
        </div>
      ) : prices.length === 0 && editing !== "new" ? (
        <div className="empty">
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
              <path d="M8 15h5" />
            </svg>
          </div>
          <p className="empty-text">{t("prices.emptyText")}</p>
          <p className="empty-hint">{t("prices.emptyHint")}</p>
        </div>
      ) : (
        <div className="list mt-4">
          {prices.map((p) =>
            editing === p._id ? (
              <div key={p._id}>{renderForm()}</div>
            ) : (
              <div className="card" key={p._id}>
                <div className="row-between">
                  <div>
                    <div
                      className="font-bold"
                      style={{ fontSize: "var(--fs-lg)" }}
                    >
                      {p.name}
                      {p.unit && (
                        <span
                          className="text-muted text-sm"
                          style={{ marginLeft: 8 }}
                        >
                          / {p.unit}
                        </span>
                      )}
                    </div>
                    <div className="amount-sm">
                      NT$ {Number(p.price).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => openEdit(p)}
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost-danger"
                      onClick={() => handleDelete(p)}
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </>
  );
}
