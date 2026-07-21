"use client";

import { useEffect, useState } from "react";

const EMPTY_FORM = { name: "", phone: "", plate: "", address: "", note: "" };

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
