import { normalizePhone } from "@/lib/normalizers";

export function getWhatsAppPhoneFromUrl(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (hostname !== "wa.me") return "";
    return normalizePhone(url.pathname.replace(/^\/+/, "").split(/[/?#]/, 1)[0] || "");
  } catch {
    return "";
  }
}
