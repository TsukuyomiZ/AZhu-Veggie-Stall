"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [authed, setAuthed] = useState(null); // null = 確認中
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((d) => {
        if (!cancelled) setAuthed(!!d.authed);
      })
      .catch(() => {
        if (!cancelled) setAuthed(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    if (!password) {
      setError("請輸入密碼");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // 整頁重新載入，讓底部導覽列跟著更新
        window.location.href = "/";
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || "登入失敗,請再試一次");
    } catch (_) {
      setError("網路錯誤,請再試一次");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">登入</h1>
          <p className="page-subtitle">阿珠菜攤</p>
        </div>
      </header>

      {authed === null && <p className="text-muted text-center mt-6">確認登入狀態中…</p>}

      {authed === true && (
        <div className="card mt-4">
          <p className="text-center">你已經登入了,可以使用全部功能。</p>
          <div className="btn-row mt-4">
            <button
              type="button"
              className="btn btn-ghost-danger"
              disabled={busy}
              onClick={handleLogout}
            >
              登出
            </button>
            <Link href="/" className="btn btn-primary">回今日備貨</Link>
          </div>
        </div>
      )}

      {authed === false && (
        <>
          <form className="card mt-4" onSubmit={handleLogin}>
            <div className="field">
              <label className="field-label" htmlFor="login-password">密碼</label>
              <input
                id="login-password"
                className={error ? "input input-error" : "input"}
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && <p className="field-error">{error}</p>}
            </div>
            <button type="submit" className="btn btn-primary btn-block mt-4" disabled={busy}>
              {busy ? "登入中…" : "登入"}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-muted text-sm">沒有密碼嗎?</p>
            <Link href="/" className="btn btn-ghost btn-block mt-2">
              不登入,只看今日備貨
            </Link>
          </div>
        </>
      )}
    </>
  );
}
