import { normalizeWebsite } from "@/lib/normalizers";

export type WebsiteSignal = "missing" | "social-only" | "basic" | "existing";

export function inferWebsiteSignal(prospect: { website: string }) {
  if (!prospect.website) {
    return "missing" satisfies WebsiteSignal;
  }

  const website = normalizeWebsite(prospect.website);

  if (
    website.includes("facebook.com") ||
    website.includes("instagram.com") ||
    website.includes("wa.me") ||
    website.includes("linktr.ee")
  ) {
    return "social-only" satisfies WebsiteSignal;
  }

  if (
    website.includes("ueniweb.com") ||
    website.includes("wixsite.com") ||
    website.includes("sites.google.com") ||
    website.includes("jimdo.com") ||
    website.includes("jimdosite.com") ||
    website.includes("jimdofree.com") ||
    website.includes("webnode.mx") ||
    website.includes("webnode.com") ||
    website.includes("weebly.com") ||
    website.includes("negociosonline.com.mx") ||
    website.includes("yola.com") ||
    website.includes("1and1.mx") ||
    website.includes("ionos.mx") ||
    website.includes("wordpress.com") ||
    website.includes("myshopify.com")
  ) {
    return "basic" satisfies WebsiteSignal;
  }

  return "existing" satisfies WebsiteSignal;
}
