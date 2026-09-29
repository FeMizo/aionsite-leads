"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatDashboardDateTime } from "@/lib/date-format";
import { jobStatuses, jobStatusLabels } from "@/lib/job-status";
import type { DashboardJob, JobDashboardData } from "@/lib/job-types";

const PAGE_SIZE = 5;

function salaryLabel(job: DashboardJob) {
  if (job.salaryUsdMin === null && job.salaryUsdMax === null) return job.salaryLabel;
  const min = job.salaryUsdMin ?? job.salaryUsdMax;
  const max = job.salaryUsdMax ?? job.salaryUsdMin;
  return min === max ? `US$${Math.round(min ?? 0).toLocaleString()}` : `US$${Math.round(min ?? 0).toLocaleString()} - US$${Math.round(max ?? 0).toLocaleString()}`;
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function getAutofill(job: DashboardJob) {
  return [
    `Puesto: ${job.title}`,
    `Empresa: ${job.company}`,
    `Cover letter:\n${job.cover || "No hay cover guardado."}`,
    `Notas del formulario:\n${job.notes || "Sin notas."}`,
  ].join("\n\n");
}

export function JobsWorkspace({ data }: { data: JobDashboardData }) {
  const router = useRouter();
  const [jobs, setJobs] = useState(data.jobs);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<"list" | "board">("list");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(data.jobs[0]?.id || "");
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesStatus = status === "all" || job.status === status;
      const haystack = [job.company, job.title, job.source, job.region, job.zone, job.fitReason, ...job.stack].join(" ").toLowerCase();
      return matchesStatus && (!normalized || haystack.includes(normalized));
    });
  }, [jobs, query, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = view === "list" ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : filtered;
  const selected = jobs.find((job) => job.id === selectedId) || visible[0] || jobs[0] || null;
  const columns = jobStatuses.map((columnStatus) => ({
    status: columnStatus,
    jobs: filtered.filter((job) => job.status === columnStatus),
  }));

  async function changeStatus(id: string, nextStatus: string) {
    if (!jobStatuses.includes(nextStatus as (typeof jobStatuses)[number])) return;
    setSavingId(id);
    setMessage("");
    setJobs((current) => current.map((job) => job.id === id ? { ...job, status: nextStatus as DashboardJob["status"], lastTouchedAt: new Date().toISOString() } : job));
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "changeStatus", id, status: nextStatus }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "No se pudo guardar el estado."));
      setMessage("Estado guardado.");
      router.refresh();
    } catch (error) {
      setJobs(data.jobs);
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el estado.");
    } finally {
      setSavingId("");
    }
  }

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setPage(1);
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel__heading">
          <div>
            <p className="eyebrow">Jobs</p>
            <h2>Vacantes laborales</h2>
            <p>Acciones exclusivas de empleo: revisar, cambiar estado, preparar cover y abrir la postulación.</p>
          </div>
          <div className="panel__actions">
            <button className="button button--secondary" type="button" onClick={() => setView("list")}>Lista</button>
            <button className="button button--secondary" type="button" onClick={() => setView("board")}>Columnas</button>
          </div>
        </div>
        <div className="dashboard-metrics">
          <div className="metric-card"><span>Total jobs</span><strong>{jobs.length}</strong></div>
          <div className="metric-card"><span>Nuevos hoy</span><strong>{data.newJobsToday}</strong></div>
          <div className="metric-card"><span>Por aplicar</span><strong>{data.statusCounts.para_aplicar}</strong></div>
          <div className="metric-card"><span>Bloqueados</span><strong>{data.statusCounts.bloqueado}</strong></div>
          <div className="metric-card"><span>Sin acción</span><strong>{data.statusCounts.no_disponible + data.statusCounts.no_entra_en_planes}</strong></div>
        </div>
        <div className="jobs-toolbar">
          <input className="form-input" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar empresa, puesto o stack" />
          <select className="form-input" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="all">Todos los estados</option>
            {jobStatuses.map((item) => <option key={item} value={item}>{jobStatusLabels[item]}</option>)}
          </select>
          <button className="button button--secondary" type="button" onClick={resetFilters}>Limpiar</button>
        </div>
        {message ? <p className="form-feedback">{message}</p> : null}
      </section>

      {view === "list" ? (
        <section className="panel">
          <div className="crm-table-wrap">
            <table className="crm-table">
              <thead><tr><th>Puesto</th><th>Salario</th><th>Zona</th><th>Stack</th><th>Estado</th></tr></thead>
              <tbody>
                {visible.map((job) => (
                  <tr className={`crm-table__row ${job.id === selected?.id ? "is-selected" : ""}`} key={job.id} onClick={() => setSelectedId(job.id)}>
                    <td><strong>{job.title}</strong><br /><span>{job.company}</span><br /><small>{job.source}</small></td>
                    <td>{salaryLabel(job)}<br /><small>{job.salaryCurrency}</small></td>
                    <td>{job.zone}<br /><small>{job.region}</small></td>
                    <td>{job.stack.join(" · ")}</td>
                    <td><select className={`status-select status-select--${job.status}`} value={job.status} disabled={savingId === job.id} onClick={(event) => event.stopPropagation()} onChange={(event) => void changeStatus(job.id, event.target.value)}>{jobStatuses.map((item) => <option key={item} value={item}>{jobStatusLabels[item]}</option>)}</select></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!visible.length ? <p className="empty-state">No hay jobs con esos filtros.</p> : null}
          <div className="crm-pagination"><span>{filtered.length ? `${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, filtered.length)} de ${filtered.length}` : "0 jobs"}</span><div><button className="crm-pagination__btn" type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</button><button className="crm-pagination__btn" type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Siguiente</button></div></div>
        </section>
      ) : (
        <section className="jobs-board">
          {columns.map((column) => (
            <div className="jobs-board__column" key={column.status} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const id = event.dataTransfer.getData("text/plain"); if (id) void changeStatus(id, column.status); }}>
              <div className="jobs-board__heading"><strong>{jobStatusLabels[column.status]}</strong><span>{column.jobs.length}</span></div>
              {column.jobs.map((job) => <button className={`jobs-board__card ${selected?.id === job.id ? "is-selected" : ""}`} draggable key={job.id} type="button" onClick={() => setSelectedId(job.id)} onDragStart={(event) => event.dataTransfer.setData("text/plain", job.id)}><strong>{job.title}</strong><span>{job.company}</span><small>{salaryLabel(job)} · {job.region}</small></button>)}
            </div>
          ))}
        </section>
      )}

      {selected ? (
        <section className="panel jobs-detail">
          <div className="panel__heading"><div><p className="eyebrow">Detalle del job</p><h2>{selected.title}</h2><p>{selected.company} · {selected.source} · {selected.region}</p></div><a className="button button--primary" href={selected.link} target="_blank" rel="noreferrer">Abrir postulación</a></div>
          <div className="jobs-detail__grid"><div><strong>Fit</strong><p>{selected.fitReason || "Sin nota de encaje."}</p></div><div><strong>Salario</strong><p>{salaryLabel(selected)}</p></div><div><strong>Última actualización</strong><p>{formatDashboardDateTime(selected.lastTouchedAt)}</p></div></div>
          <div className="jobs-detail__actions"><button className="button button--secondary" type="button" onClick={() => void copyText(getAutofill(selected)).then(() => setMessage("Cover y datos copiados para autofill asistido."))}>Copiar cover y datos</button><a className="button button--secondary" href={`mailto:?subject=${encodeURIComponent(`${selected.title} - ${selected.company}`)}&body=${encodeURIComponent(selected.cover)}`}>Preparar email</a></div>
          <details><summary>Cover</summary><pre>{selected.cover || "Sin cover."}</pre></details><details><summary>Notas y formulario</summary><pre>{selected.notes || "Sin notas."}</pre></details>
        </section>
      ) : null}
      <p className="muted-note">Última búsqueda: {data.lastJobsSearchAt ? formatDashboardDateTime(data.lastJobsSearchAt) : "sin registro"}</p>
    </div>
  );
}
