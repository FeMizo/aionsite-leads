"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/lib/api-client";
import { getProspectStatusLabel } from "@/lib/prospect-status";

export const EDITABLE_PROSPECT_STATUSES = [
  "generated",
  "analyzed",
  "approved",
  "ready",
  "contacted",
  "replied",
  "followup",
  "closed",
  "rejected",
  "uncontactable",
] as const;

type ProspectStatusControlProps = {
  prospectId: string;
  status: string;
  className?: string;
};

export function ProspectStatusControl({
  prospectId,
  status,
  className,
}: ProspectStatusControlProps) {
  const [value, setValue] = useState(status);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function save(nextStatus: string) {
    if (nextStatus === status || saving) {
      return;
    }

    setValue(nextStatus);
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "changeStatus",
          ids: [prospectId],
          status: nextStatus,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, "No se pudo guardar el estado."));
      }

      setMessage("Guardado");
      router.refresh();
    } catch (requestError) {
      setValue(status);
      setError(requestError instanceof Error ? requestError.message : "No se pudo guardar el estado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`prospect-status-control ${className || ""}`.trim()}>
      <select
        className="status-select"
        value={value}
        disabled={saving}
        onChange={(event) => void save(event.target.value)}
        aria-label="Cambiar estado del prospecto"
      >
        {EDITABLE_PROSPECT_STATUSES.map((option) => (
          <option key={option} value={option}>
            {getProspectStatusLabel(option)}
          </option>
        ))}
      </select>
      {saving ? <span className="prospect-status-control__feedback">Guardando...</span> : null}
      {!saving && message ? <span className="prospect-status-control__feedback">{message}</span> : null}
      {error ? <span className="prospect-status-control__error">{error}</span> : null}
    </div>
  );
}
