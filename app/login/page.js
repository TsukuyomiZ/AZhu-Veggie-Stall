"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";

export default function LoginPage() {
  const { t } = useI18n();
  const [authed, setAuthed] = useState(null); // null = 確認中
  const [password, setPassword] = useState("");
  // 錯誤存 { key } 或 { text }:key = 前端訊息(render 時 t(),切語言跟著換);
  // text = 伺服器回的中文錯誤,照原樣顯示不翻
  const [error, setError] = useState(null);
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
      setError({ key: "login.enterPassword" });
      return;
    }
    setBusy(true);
    setError(null);
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
      setError(data.error ? { text: data.error } : { key: "login.failed" });
    } catch (_) {
      setError({ key: "login.networkError" });
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

  const errorText = error ? (error.key ? t(error.key) : error.text) : "";

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">{t("nav.login")}</h1>
          <p className="page-subtitle">{t("app.name")}</p>
        </div>
      </header>

      <LangToggle />

      {authed === null && (
        <p className="text-muted text-center mt-6">{t("auth.checking")}</p>
      )}

      {authed === true && (
        <div className="card mt-4">
          <p className="text-center">{t("login.alreadyIn")}</p>
          <div className="btn-row mt-4">
            <button
              type="button"
              className="btn btn-ghost-danger"
              disabled={busy}
              onClick={handleLogout}
            >
              {t("login.logout")}
            </button>
            <Link href="/" className="btn btn-primary">{t("login.backToday")}</Link>
          </div>
        </div>
      )}

      {authed === false && (
        <>
          <form className="card mt-4" onSubmit={handleLogin}>
            <div className="field">
              <label className="field-label" htmlFor="login-password">
                {t("login.password")}
              </label>
              <input
                id="login-password"
                className={errorText ? "input input-error" : "input"}
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
              />
              {errorText && <p className="field-error">{errorText}</p>}
            </div>
            <button type="submit" className="btn btn-primary btn-block mt-4" disabled={busy}>
              {busy ? t("login.loggingIn") : t("nav.login")}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-muted text-sm">{t("login.noPassword")}</p>
            <Link href="/" className="btn btn-ghost btn-block mt-2">
              {t("login.guestLink")}
            </Link>
          </div>
        </>
      )}
    </>
  );
}
