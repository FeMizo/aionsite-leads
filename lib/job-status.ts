import type { JobStatus } from "@/generated/prisma";

export const jobStatuses: JobStatus[] = [
  "pendiente",
  "para_aplicar",
  "aplicado",
  "skipeado",
  "no_entra_en_planes",
  "no_disponible",
  "follow_up",
  "en_espera",
  "rechazado",
  "bloqueado",
  "guardado_para_despues",
];

export const jobStatusLabels: Record<JobStatus, string> = {
  pendiente: "Pendiente",
  para_aplicar: "Por aplicar",
  aplicado: "Aplicado",
  skipeado: "Skipeado",
  no_entra_en_planes: "No entra en planes",
  no_disponible: "No disponible",
  follow_up: "Follow-up",
  en_espera: "En espera",
  rechazado: "Rechazado",
  bloqueado: "Bloqueado",
  guardado_para_despues: "Guardado para después",
};
