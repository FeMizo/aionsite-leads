export type CrmStatus =
  | "generated"
  | "prospect"
  | "contacted"
  | "failed"
  | "replied"
  | "closed"
  | "archived"
  | "deleted";

export type CrmRecord = {
  id: string;
  name: string;
  businessName: string;
  contactName: string;
  email: string;
  website: string;
  phone: string;
  category: string;
  type: string;
  city: string;
  source: string;
  status: CrmStatus;
  createdAt: string;
  generatedAt: string;
  updatedAt: string;
  sentAt: string;
  notes: string;
  lastError: string;
  rating: string;
  mapsUrl: string;
  opportunity: string;
  recommendedSite: string;
  pitchAngle: string;
  businessStatus: string;
  lastMessageId?: string;
};

export type CrmHistoryEntry = {
  id: string;
  recordId: string;
  businessName: string;
  fromStatus: string;
  toStatus: string;
  action: string;
  at: string;
  note: string;
  error: string;
  meta?: Record<string, string>;
};

export type OverviewMetrics = {
  generated: number;
  prospects: number;
  contacted: number;
  failed: number;
  totalSent: number;
};

export type RecordAction =
  | "approveGenerated"
  | "archiveRecords"
  | "deleteRecords"
  | "sendEmails"
  | "moveToProspects"
  | "markContacted"
  | "markAsClient"
  | "restoreFailed";
