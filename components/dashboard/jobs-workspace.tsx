"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatDashboardDateTime } from "@/lib/date-format";
import { compareSortValues, type SortDirection, type SortType } from "@/lib/table-sort";
import { SortIndicator } from "@/components/dashboard/sort-indicator";
import { jobStatuses, jobStatusLabels } from "@/lib/job-status";
import type { DashboardJob, JobDashboardData } from "@/lib/job-types";
import type { JobStatus } from "@/generated/prisma";

const PAGE_SIZE = 5;
const jobFilters = ["all", ...jobStatuses] as const;

export type JobFilter = (typeof jobFilters)[number];
type JobSortKey = "title" | "salary" | "zone" | "stack" | "status" | "updatedAt";

type JobColumn = {
  key: JobSortKey;
  label: string;
  type: SortType;
  defaultDirection: SortDirection;
  getValue: (job: DashboardJob) => unknown;
};

const jobColumns: JobColumn[] = [
  { key: "title", label: "Puesto", type: "string", defaultDirection: "asc", getValue: (job) => `${job.title} ${job.company}` },
  { key: "salary", label: "Salario", type: "number", defaultDirection: "desc", getValue: (job) => job.salaryUsdMin ?? job.salaryUsdMax },
  { key: "zone", label: "Zona", type: "string", defaultDirection: "asc", getValue: (job) => `${job.zone} ${job.region}` },
  { key: "stack", label: "Stack", type: "string", defaultDirection: "asc", getValue: (job) => job.stack.join(" ") },
  { key: "status", label: "Estado", type: "string", defaultDirection: "asc", getValue: (job) => jobStatusLabels[job.status] },
  { key: "updatedAt", label: "Actualizado", type: "date", defaultDirection: "desc", getValue: (job) => job.updatedAt },
];

function salaryLabel(job: DashboardJob) {
  if (job.salaryUsdMin === null && job.salaryUsdMax === null) return job.salaryLabel;
  const min = job.salaryUsdMin ?? job.salaryUsdMax;
  const max = job.salaryUsdMax ?? job.salaryUsdMin;
  return min === max
    ? `US$${Math.round(min ?? 0).toLocaleString()}`
    : `US$${Math.round(min ?? 0).toLocaleString()} - US$${Math.round(max ?? 0).toLocaleString()}`;
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

export function JobsWorkspace({ data, initialStatus = "all" }: { data: JobDashboardData; initialStatus?: JobFilter }) {
  const router = useRouter();
  const [jobs, setJobs] = useState(data.jobs);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<JobFilter>(initialStatus);
  const [view, setView] = useState<"list" | "board">("list");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(data.jobs[0]?.id || "");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<JobStatus>("para_aplicar");
  const [sortState, setSortState] = useState<{ key: JobSortKey; direction: SortDirection } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let nextJobs = jobs.filter((job) => {
      const matchesStatus = status === "all" || job.status === status;
      const haystack = [job.company, job.title, job.source, job.region, job.zone, job.fitReason, job.notes, job.link, job.dbId, job.status, jobStatusLabels[job.status], ...job.stack].join(" ").toLowerCase();
      return matchesStatus && (!normalized || haystack.includes(normalized));
    });

    if (sortState) {
      const column = jobColumns.find((item) => item.key === sortState.key);
      if (column) nextJobs = [...nextJobs].sort((left, right) => compareSortValues(column.getValue(left), column.getValue(right), column.type, sortState.direction));
    }

    return nextJobs;
  }, [jobs, query, sortState, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = view === "list" ? filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) : filtered;
  const selected = jobs.find((job) => job.id === selectedId) || visible[0] || jobs[0] || null;
  const detailJob = detailId ? jobs.find((job) => job.id === detailId) || null : null;
  const columns = jobStatuses.map((columnStatus) => ({ status: columnStatus, jobs: filtered.filter((job) => job.status === columnStatus) }));
  const selectableIds = visible.map((job) => job.id);
  const allVisibleSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setStatus(initialStatus);
    setPage(1);
    setSelectedIds([]);
  }, [initialStatus]);

  useEffect(() => {
    const visibleIds = new Set(filtered.map((job) => job.id));
    setSelectedIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [filtered]);

  useEffect(() => {
    if (!detailJob) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setDetailId(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [detailJob]);

  async function changeStatuses(ids: string[], nextStatus: string) {
    if (!ids.length || !jobStatuses.includes(nextStatus as JobStatus) || busy) return;
    const validStatus = nextStatus as JobStatus;
    const now = new Date().toISOString();
    setBusy(true);
    setMessage("");
    setJobs((current) => current.map((job) => ids.includes(job.id) ? { ...job, status: validStatus, lastTouchedAt: now, updatedAt: now } : job));

    try {
      const response = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "changeStatus", ids, status: validStatus }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(getApiErrorMessage(payload, "No se pudo guardar el estado."));
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
      setMessage(ids.length === 1 ? "Estado guardado." : `Se actualizaron ${ids.length} jobs.`);
      router.refresh();
    } catch (error) {
      setJobs(data.jobs);
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el estado.");
    } finally {
      setBusy(false);
    }
  }

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setSortState(null);
    setPage(1);
    setSelectedIds([]);
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAll() {
    setSelectedIds((current) => allVisibleSelected ? current.filter((id) => !selectableIds.includes(id)) : [...new Set([...current, ...selectableIds])]);
  }

  function toggleSort(column: JobColumn) {
    setSortState((current) => {
      if (!current || current.key !== column.key) return { key: column.key, direction: column.defaultDirection };
      return { key: column.key, direction: current.direction === "asc" ? "desc" : "asc" };
    });
  }

  function getSortDirection(key: JobSortKey): SortDirection | null {
    return sortState?.key === key ? sortState.direction : null;
  }

  function openDetails(job: DashboardJob) {
    setSelectedId(job.id);
    setDetailId(job.id);
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel__heading">
          <div><p className="eyebrow">Jobs</p><h2>Vacantes laborales</h2><p>Acciones exclusivas de empleo: revisar, cambiar estado, preparar cover y abrir la postulación.</p></div>
          <div className="panel__actions"><button className={`button ${view === "list" ? "button--primary" : "button--secondary"}`} type="button" onClick={() => setView("list")}>Lista</button><button className={`button ${view === "board" ? "button--primary" : "button--secondary"}`} type="button" onClick={() => setView("board")}>Columnas</button></div>
        </div>
        <div className="dashboard-metrics"><div className="metric-card"><span>Total jobs</span><strong>{jobs.length}</strong></div><div className="metric-card"><span>Nuevos hoy</span><strong>{data.newJobsToday}</strong></div><div className="metric-card"><span>Por aplicar</span><strong>{data.statusCounts.para_aplicar}</strong></div><div className="metric-card"><span>Bloqueados</span><strong>{data.statusCounts.bloqueado}</strong></div><div className="metric-card"><span>Sin acción</span><strong>{data.statusCounts.no_disponible + data.statusCounts.no_entra_en_planes}</strong></div></div>
        <div className="jobs-toolbar"><input className="form-input" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar empresa, puesto, stack o nota" /><button className="button button--secondary" type="button" onClick={resetFilters}>Limpiar</button></div>
        <div className="crm-workspace__filters jobs-workspace__filters" role="tablist" aria-label="Filtrar jobs por etapa">
          {jobFilters.map((filter) => { const count = filter === "all" ? jobs.length : jobs.filter((job) => job.status === filter).length; const active = status === filter; return <button key={filter} type="button" role="tab" aria-selected={active} className={active ? "crm-workspace__filter is-active" : "crm-workspace__filter"} onClick={() => { setStatus(filter); setPage(1); setSelectedIds([]); }}><span>{filter === "all" ? "Todos" : jobStatusLabels[filter]}</span><strong>{count}</strong></button>; })}
        </div>
        {selectedIds.length ? <div className="panel__actions jobs-bulk-actions"><span className="muted-note">{selectedIds.length} seleccionados</span><select className="status-select" value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as JobStatus)} aria-label="Nuevo estado para jobs seleccionados">{jobStatuses.map((item) => <option key={item} value={item}>{jobStatusLabels[item]}</option>)}</select><button className="crm-button crm-button--primary" type="button" disabled={busy} onClick={() => void changeStatuses(selectedIds, bulkStatus)}>Cambiar estado</button><button className="crm-button crm-button--secondary" type="button" onClick={() => setSelectedIds([])}>Quitar selección</button></div> : null}
        {message ? <p className="form-feedback" role="status">{message}</p> : null}
      </section>

      {view === "list" ? <section className="panel"><div className="crm-table-wrap"><table className="crm-table"><thead><tr><th><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} disabled={!selectableIds.length} aria-label="Seleccionar jobs visibles" /></th>{jobColumns.map((column) => <th key={column.key}><button type="button" className={`crm-table__sort ${sortState?.key === column.key ? "is-active" : ""}`} onClick={() => toggleSort(column)}>{column.label}<SortIndicator direction={getSortDirection(column.key)} /></button></th>)}<th>Abrir</th></tr></thead><tbody>{visible.map((job) => <tr className={`crm-table__row ${job.id === selected?.id ? "is-selected" : ""}`} key={job.id} onClick={() => openDetails(job)}><td><input type="checkbox" checked={selectedIds.includes(job.id)} onClick={(event) => event.stopPropagation()} onChange={() => toggleSelection(job.id)} aria-label={`Seleccionar ${job.title}`} /></td><td><div className="record-primary"><strong>{job.title}</strong><span>{job.company}</span><small>{job.source}</small></div></td><td>{salaryLabel(job)}<br /><small>{job.salaryCurrency}</small></td><td>{job.zone}<br /><small>{job.region}</small></td><td>{job.stack.join(" · ")}</td><td><select className="status-select" value={job.status} disabled={busy} onClick={(event) => event.stopPropagation()} onChange={(event) => void changeStatuses([job.id], event.target.value)} aria-label={`Cambiar estado de ${job.title}`}>{jobStatuses.map((item) => <option key={item} value={item}>{jobStatusLabels[item]}</option>)}</select></td><td>{formatDashboardDateTime(job.updatedAt)}</td><td><a href={job.link} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Abrir</a></td></tr>)}</tbody></table></div>{!visible.length ? <p className="empty-state">No hay jobs con esos filtros.</p> : null}<div className="crm-pagination"><span>{filtered.length ? `${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, filtered.length)} de ${filtered.length}` : "0 jobs"}</span><div><button className="crm-pagination__btn" type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</button><button className="crm-pagination__btn" type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => value + 1)}>Siguiente</button></div></div></section> : <section className="jobs-board">{columns.map((column) => <div className="jobs-board__column" key={column.status} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const id = event.dataTransfer.getData("text/plain"); if (id) void changeStatuses([id], column.status); }}><div className="jobs-board__heading"><strong>{jobStatusLabels[column.status]}</strong><span>{column.jobs.length}</span></div>{column.jobs.map((job) => <button className={`jobs-board__card ${selected?.id === job.id ? "is-selected" : ""}`} draggable key={job.id} type="button" onClick={() => openDetails(job)} onDragStart={(event) => event.dataTransfer.setData("text/plain", job.id)}><strong>{job.title}</strong><span>{job.company}</span><small>{salaryLabel(job)} · {job.region}</small></button>)}{!column.jobs.length ? <p className="jobs-board__empty">Sin jobs</p> : null}</div>)}</section>}

      {detailJob ? <div className="crm-drawer-layer" role="presentation" onMouseDown={() => setDetailId(null)}><aside className="crm-drawer" role="dialog" aria-modal="true" aria-labelledby="job-drawer-title" onMouseDown={(event) => event.stopPropagation()}><div className="crm-drawer__header"><div><span className="page-header__eyebrow">Vista rápida</span><h2 id="job-drawer-title">{detailJob.title}</h2><p>{detailJob.company} · {detailJob.source}</p></div><button type="button" className="crm-drawer__close" aria-label="Cerrar detalles" onClick={() => setDetailId(null)}>×</button></div><div className="crm-drawer__body"><div className="crm-drawer__badges"><select className="status-select" value={detailJob.status} disabled={busy} onChange={(event) => void changeStatuses([detailJob.id], event.target.value)} aria-label={`Estado de ${detailJob.title}`}>{jobStatuses.map((item) => <option key={item} value={item}>{jobStatusLabels[item]}</option>)}</select></div><dl className="crm-drawer__facts"><div><dt>Salario</dt><dd>{salaryLabel(detailJob)} · {detailJob.salaryCurrency}</dd></div><div><dt>Zona</dt><dd>{detailJob.zone} · {detailJob.region}</dd></div><div><dt>Stack</dt><dd>{detailJob.stack.join(" · ") || "Sin stack"}</dd></div><div><dt>Actualizado</dt><dd>{formatDashboardDateTime(detailJob.updatedAt)}</dd></div></dl><section className="crm-drawer__section"><h3>Encaje</h3><p>{detailJob.fitReason || "Sin nota de encaje."}</p></section><section className="crm-drawer__section"><h3>Cover</h3><p className="crm-drawer__message">{detailJob.cover || "Sin cover."}</p></section><section className="crm-drawer__section"><h3>Formulario y notas</h3><p className="crm-drawer__message">{detailJob.notes || "Sin notas."}</p></section></div><div className="crm-drawer__footer"><a href={detailJob.link} target="_blank" rel="noreferrer" className="crm-button crm-button--primary">Abrir postulación</a><button type="button" className="crm-button crm-button--secondary" onClick={() => void copyText(getAutofill(detailJob)).then(() => setMessage("Cover y datos copiados."))}>Copiar cover y datos</button></div></aside></div> : null}
      <p className="muted-note">Última búsqueda: {data.lastJobsSearchAt ? formatDashboardDateTime(data.lastJobsSearchAt) : "sin registro"}</p>
    </div>
  );
}
