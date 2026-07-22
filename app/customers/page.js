"use client";

import { useEffect, useState } from "react";

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
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // editing: null = 沒開表單;"new" = 新增;其他 = 編輯中客戶的 _id
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // 批次匯入
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState(null); // null = 還沒解析
  const [importBusy, setImportBusy] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [importResult, setImportResult] = useState("");

  async function fetchCustomers() {
    try {
      setLoadError("");
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCustomers(data);
    } catch {
      setLoadError("載入客戶資料失敗,請稍後再試");
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
    setNameError("");
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
    setNameError("");
    setFormError("");
  }

  function closeForm() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setNameError("");
    setFormError("");
  }

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "name" && value.trim()) setNameError("");
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setNameError("請輸入姓名");
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
        throw new Error(data.error || "儲存失敗,請稍後再試");
      }
      closeForm();
      await fetchCustomers();
    } catch (err) {
      setFormError(err.message || "儲存失敗,請稍後再試");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c) {
    if (!window.confirm(`確定要刪除 ${c.name} 嗎?`)) return;
    try {
      const res = await fetch(`/api/customers/${c._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      if (editing === c._id) closeForm();
      await fetchCustomers();
    } catch {
      window.alert("刪除失敗,請稍後再試");
    }
  }

  function closeImport() {
    setImportOpen(false);
    setImportText("");
    setImportPreview(null);
    setImportProgress("");
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
      setImportProgress(`匯入中… ${i + 1}/${rows.length}`);
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
    setImportResult(
      `成功匯入 ${ok} 位` + (failed.length > 0 ? `,失敗 ${failed.length} 位:${failed.join("、")}` : "")
    );
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
                貼上名單(一行一位:姓名 電話 車牌 地址,用空格分開)
              </label>
              <textarea
                className="textarea"
                id="import-text"
                rows={6}
                placeholder={"王媽媽 0912345678 ABC-1234\n李阿姨 0922333444 中山路10號\n陳老闆"}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
            </div>
            <div className="btn-row mt-2">
              <button type="button" className="btn btn-ghost" onClick={closeImport}>
                取消
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!importText.trim()}
                onClick={parsePreview}
              >
                解析預覽
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="font-bold">
              解析出 {importPreview.length} 位
              {importPreview.length - newRows.length > 0 &&
                `,其中 ${importPreview.length - newRows.length} 位已存在(會跳過)`}
            </p>
            <div className="mt-2">
              {importPreview.map((r, i) => (
                <div className="import-row" key={i}>
                  <span className={r.exists ? "text-muted" : "font-bold"}>{r.name}</span>
                  <span className="import-row-sub">
                    {[r.phone, r.plate, r.address].filter(Boolean).join(" · ") || "只有姓名"}
                  </span>
                  {r.exists && <span className="badge badge-gray">已存在</span>}
                </div>
              ))}
            </div>
            {importProgress && <p className="text-muted text-sm mt-2">{importProgress}</p>}
            <div className="btn-row mt-4">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={importBusy}
                onClick={() => setImportPreview(null)}
              >
                返回修改
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={importBusy || newRows.length === 0}
                onClick={runImport}
              >
                {importBusy ? "匯入中…" : `確認匯入 ${newRows.length} 位`}
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
            姓名
          </label>
          <input
            className={nameError ? "input input-error" : "input"}
            id="customer-name"
            type="text"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
          />
          {nameError && <p className="field-error">{nameError}</p>}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="customer-phone">
            電話
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
            車牌
          </label>
          <input
            className="input"
            id="customer-plate"
            type="text"
            autoCapitalize="characters"
            placeholder="例:ABC-1234"
            value={form.plate}
            onChange={(e) => setField("plate", e.target.value.toUpperCase())}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="customer-address">
            地址
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
            備註
          </label>
          <textarea
            className="textarea"
            id="customer-note"
            value={form.note}
            onChange={(e) => setField("note", e.target.value)}
          />
        </div>
        {formError && <p className="field-error">{formError}</p>}
        <div className="btn-row mt-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={closeForm}
            disabled={saving}
          >
            取消
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "儲存中…" : "儲存"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">客戶</h1>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={openNew}
          disabled={editing === "new"}
        >
          + 新增客戶
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
          批次匯入(貼上名單)
        </button>
      )}

      {importResult && <p className="field-hint text-center mt-2">{importResult}</p>}

      {importOpen && renderImportPanel()}

      {editing === "new" && <div className="mt-2">{renderForm()}</div>}

      {loading ? (
        <p className="text-muted text-center mt-6">載入中…</p>
      ) : loadError ? (
        <div className="empty">
          <p className="empty-text">{loadError}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setLoading(true);
              fetchCustomers();
            }}
          >
            重新載入
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
          <p className="empty-text">還沒有客戶,先新增一位吧</p>
          <p className="empty-hint">按右上角「+ 新增客戶」開始</p>
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
                      編輯
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost-danger"
                      onClick={() => handleDelete(c)}
                    >
                      刪除
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
