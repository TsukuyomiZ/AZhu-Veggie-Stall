"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

const EMPTY_FORM = { name: "", phone: "", plate: "", address: "", note: "" };

// 解析一行匯入文字：第一段是姓名，其餘依格式自動判斷電話/車牌，剩下併成地址
// 分隔符支援空格、逗號、頓號、Tab
function parseImportLine(line) {
  const tokens = line.trim().split(/[\s,，、\t]+/).filter(Boolean);
  if (tokens.length === 0) return null;
  const [first, ...rest] = tokens;
  const row = { name: first, phone: "", plate: "", address: "" };
  const addressParts = [];
  for (const t of rest) {
    const digits = t.replace(/-/g, "");
    if (!row.phone && /^0\d{8,9}$/.test(digits)) {
      row.phone = t;
    } else if (!row.plate && /^(?=.*[A-Za-z])[A-Za-z0-9-]+$/.test(t)) {
      row.plate = t.toUpperCase();
    } else {
      addressParts.push(t);
    }
  }
  row.address = addressParts.join(" ");
  return row;
}

export default function CustomersPage() {
  const { t } = useI18n();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  // 用 boolean 記錯誤,render 時才 t(),切語言後訊息會跟著換
  const [loadError, setLoadError] = useState(false);

  // editing: null = 沒開表單;"new" = 新增;其他 = 編輯中客戶的 _id
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [nameError, setNameError] = useState(false);
  // formError:{ text } = 伺服器原文照樣顯示;{ key } = 前端字典訊息,
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
  const [importResult, setImportResult] = useState(null); // { ok, failed: [names] }

  async function fetchCustomers() {
    try {
      setLoadError(false);
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCustomers(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCustomers();
  }, []);

  function openNew() {
    setEditing("new");
    setForm(EMPTY_FORM);
    setNameError(false);
    setFormError("");
  }

  function openEdit(c) {
    setEditing(c._id);
    setForm({
      name: c.name || "",
      phone: c.phone || "",
      plate: c.plate || "",
      address: c.address || "",
      note: c.note || "",
    });
    setNameError(false);
    setFormError("");
  }

  function closeForm() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setNameError(false);
    setFormError("");
  }

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "name" && value.trim()) setNameError(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setNameError(true);
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const isNew = editing === "new";
      const res = await fetch(
        isNew ? "/api/customers" : `/api/customers/${editing}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            phone: form.phone.trim(),
            plate: form.plate.trim(),
            address: form.address.trim(),
            note: form.note.trim(),
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // 伺服器有給錯誤訊息就照原樣顯示(不翻譯),沒有才用前端的字典訊息
        const e = new Error("save-failed");
        e.info = data.error ? { text: data.error } : { key: "customers.saveFailed" };
        throw e;
      }
      closeForm();
      await fetchCustomers();
    } catch (err) {
      setFormError(err.info || { key: "customers.saveFailed" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c) {
    if (!window.confirm(t("customers.deleteConfirm", { name: c.name }))) return;
    try {
      const res = await fetch(`/api/customers/${c._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      if (editing === c._id) closeForm();
      await fetchCustomers();
    } catch {
      window.alert(t("customers.deleteFailed"));
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
      .map((row) => ({
        ...row,
        exists: customers.some((c) => c.name === row.name),
      }));
    setImportPreview(rows);
  }

  async function runImport() {
    if (!importPreview) return;
    const rows = importPreview.filter((r) => !r.exists);
    if (rows.length === 0) return;
    setImportBusy(true);
    let ok = 0;
    const failed = [];
    for (let i = 0; i < rows.length; i++) {
      setImportProgress({ i: i + 1, total: rows.length });
      try {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: rows[i].name,
            phone: rows[i].phone,
            plate: rows[i].plate,
            address: rows[i].address,
            note: "",
          }),
        });
        if (!res.ok) throw new Error();
        ok++;
      } catch {
        failed.push(rows[i].name);
      }
    }
    await fetchCustomers();
    setImportResult({ ok, failed });
    setImportBusy(false);
    closeImport();
  }

  function renderImportPanel() {
    const newRows = importPreview ? importPreview.filter((r) => !r.exists) : [];
    return (
      <div className="card mt-2">
        {importPreview === null ? (
          <>
            <div className="field">
              <label className="field-label" htmlFor="import-text">
                {t("customers.importLabel")}
              </label>
              <textarea
                className="textarea"
                id="import-text"
                rows={6}
                placeholder={t("customers.importPlaceholder")}
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
                {t("customers.parsePreview")}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="font-bold">
              {t("customers.importParsed", { n: importPreview.length })}
              {importPreview.length - newRows.length > 0 &&
                t("customers.importParsedDup", {
                  n: importPreview.length - newRows.length,
                })}
            </p>
            <div className="mt-2">
              {importPreview.map((r, i) => (
                <div className="import-row" key={i}>
                  <span className={r.exists ? "text-muted" : "font-bold"}>{r.name}</span>
                  <span className="import-row-sub">
                    {[r.phone, r.plate, r.address].filter(Boolean).join(" · ") ||
                      t("customers.onlyName")}
                  </span>
                  {r.exists && (
                    <span className="badge badge-gray">{t("customers.existsBadge")}</span>
                  )}
                </div>
              ))}
            </div>
            {importProgress && (
              <p className="text-muted text-sm mt-2">
                {t("customers.importProgress", importProgress)}
              </p>
            )}
            <div className="btn-row mt-4">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={importBusy}
                onClick={() => setImportPreview(null)}
              >
                {t("customers.backEdit")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={importBusy || newRows.length === 0}
                onClick={runImport}
              >
                {importBusy
                  ? t("customers.importing")
                  : t("customers.confirmImport", { n: newRows.length })}
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
          <label className="field-label" htmlFor="customer-name">
            {t("customers.name")}
          </label>
          <input
            className={nameError ? "input input-error" : "input"}
            id="customer-name"
            type="text"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
          />
          {nameError && <p className="field-error">{t("customers.nameRequired")}</p>}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="customer-phone">
            {t("customers.phone")}
          </label>
          <input
            className="input"
            id="customer-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="customer-plate">
            {t("customers.plate")}
          </label>
          <input
            className="input"
            id="customer-plate"
            type="text"
            autoCapitalize="characters"
            placeholder={t("customers.platePlaceholder")}
            value={form.plate}
            onChange={(e) => setField("plate", e.target.value.toUpperCase())}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="customer-address">
            {t("customers.address")}
          </label>
          <input
            className="input"
            id="customer-address"
            type="text"
            value={form.address}
            onChange={(e) => setField("address", e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="customer-note">
            {t("customers.note")}
          </label>
          <textarea
            className="textarea"
            id="customer-note"
            value={form.note}
            onChange={(e) => setField("note", e.target.value)}
          />
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
            {saving ? t("customers.saving") : t("common.save")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">{t("customers.title")}</h1>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={openNew}
          disabled={editing === "new"}
        >
          {t("customers.addNew")}
        </button>
      </header>

      {editing !== "new" && !importOpen && (
        <button
          type="button"
          className="btn btn-ghost btn-block mt-2"
          onClick={() => {
            setImportOpen(true);
            setImportResult("");
          }}
        >
          {t("customers.batchImport")}
        </button>
      )}

      {importResult && (
        <p className="field-hint text-center mt-2">
          {t("customers.importSuccess", { n: importResult.ok }) +
            (importResult.failed.length > 0
              ? t("customers.importFailedPart", {
                  n: importResult.failed.length,
                  names: importResult.failed.join(t("customers.nameSeparator")),
                })
              : "")}
        </p>
      )}

      {importOpen && renderImportPanel()}

      {editing === "new" && <div className="mt-2">{renderForm()}</div>}

      {loading ? (
        <p className="text-muted text-center mt-6">{t("common.loading")}</p>
      ) : loadError ? (
        <div className="empty">
          <p className="empty-text">{t("customers.loadError")}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setLoading(true);
              fetchCustomers();
            }}
          >
            {t("common.retry")}
          </button>
        </div>
      ) : customers.length === 0 && editing !== "new" ? (
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M19 8v6" />
              <path d="M22 11h-6" />
            </svg>
          </div>
          <p className="empty-text">{t("customers.emptyText")}</p>
          <p className="empty-hint">{t("customers.emptyHint")}</p>
        </div>
      ) : (
        <div className="list mt-4">
          {customers.map((c) =>
            editing === c._id ? (
              <div key={c._id}>{renderForm()}</div>
            ) : (
              <div className="card" key={c._id}>
                <div className="row-between">
                  <div>
                    <div
                      className="font-bold"
                      style={{ fontSize: "var(--fs-lg)" }}
                    >
                      {c.name}
                      {c.plate && (
                        <span className="badge badge-gray" style={{ marginLeft: 8 }}>
                          {c.plate}
                        </span>
                      )}
                    </div>
                    {c.phone && (
                      <div className="text-muted text-sm">
                        <a href={`tel:${c.phone}`}>{c.phone}</a>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => openEdit(c)}
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost-danger"
                      onClick={() => handleDelete(c)}
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </div>
                {c.address && (
                  <div className="text-muted text-sm mt-2">{c.address}</div>
                )}
                {c.note && (
                  <div className="text-muted text-sm mt-2">{c.note}</div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </>
  );
}
