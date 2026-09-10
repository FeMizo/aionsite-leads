"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SetupForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) });
    const payload = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) return setError(payload.error?.message || "No se pudo guardar la configuración.");
    router.push("/login");
  }
  return <main className="auth-page"><form className="auth-card" onSubmit={submit}><p className="app-topbar__eyebrow">Configuración inicial</p><h1>Protege tu dashboard</h1><p>Crea el usuario que usarás para entrar al CRM.</p><label>Usuario<input name="username" minLength={3} required autoComplete="username" /></label><label>Contraseña<input name="password" type="password" minLength={12} required autoComplete="new-password" /></label>{error ? <p className="crm-error">{error}</p> : null}<button className="crm-button crm-button--primary" disabled={busy}>{busy ? "Guardando..." : "Guardar y continuar"}</button></form></main>;
}
