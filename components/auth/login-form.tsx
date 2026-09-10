"use client";

import { FormEvent, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter(); const searchParams = useSearchParams();
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) });
    const payload = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) return setError(payload.error?.message || "No se pudo iniciar sesión.");
    const next = searchParams.get("next")?.startsWith("/") ? searchParams.get("next") : "/dashboard";
    router.push(next || "/dashboard"); router.refresh();
  }
  return <main className="auth-page"><form className="auth-card" onSubmit={submit}><p className="app-topbar__eyebrow">AionSite CRM</p><h1>Iniciar sesión</h1><p>Accede al dashboard operativo.</p><label>Usuario<input name="username" required autoComplete="username" /></label><label>Contraseña<input name="password" type="password" required autoComplete="current-password" /></label>{error ? <p className="crm-error">{error}</p> : null}<button className="crm-button crm-button--primary" disabled={busy}>{busy ? "Entrando..." : "Entrar"}</button><a href="/setup">Configuración inicial</a></form></main>;
}
