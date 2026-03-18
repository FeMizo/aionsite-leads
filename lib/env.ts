export const DATABASE_ENV_KEYS = [
  "DATABASE_URL",
  "leads_DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "leads_POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "leads_POSTGRES_URL",
] as const;
export const GOOGLE_PLACES_ENV_KEYS = [
  "GOOGLE_MAPS_API_KEY",
  "GOOGLE_PLACES_API_KEY",
] as const;
export const SMTP_ENV_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"] as const;
const GOOGLE_PLACES_ENDPOINT_KEYS = ["GOOGLE_PLACES_ENDPOINT"] as const;
const FROM_NAME_ENV_KEYS = ["FROM_NAME"] as const;
const FROM_EMAIL_ENV_KEYS = ["FROM_EMAIL"] as const;
const CRON_SECRET_ENV_KEYS = ["CRON_SECRET"] as const;

function hasValue(key: string) {
  return Boolean(process.env[key]?.trim());
}

export function getFirstEnvValue(keys: readonly string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();

    if (value) {
      return value;
    }
  }

  return "";
}

export function getMissingEnvVars(keys: readonly string[]) {
  return getFirstEnvValue(keys) ? [] : [...keys];
}

export function isDatabaseConfigured() {
  return getMissingEnvVars(DATABASE_ENV_KEYS).length === 0;
}

export function isGooglePlacesConfigured() {
  return getMissingEnvVars(GOOGLE_PLACES_ENV_KEYS).length === 0;
}

export function isSmtpConfigured() {
  return getMissingEnvVars(SMTP_ENV_KEYS).length === 0;
}

export function getDatabaseUrl() {
  return getFirstEnvValue(DATABASE_ENV_KEYS);
}

export function getGooglePlacesApiKey() {
  return getFirstEnvValue(GOOGLE_PLACES_ENV_KEYS);
}

export function getGooglePlacesEndpoint(defaultValue: string) {
  return getFirstEnvValue(GOOGLE_PLACES_ENDPOINT_KEYS) || defaultValue;
}

export function getSmtpHost() {
  return getFirstEnvValue(["SMTP_HOST"]);
}

export function getSmtpPort() {
  return getFirstEnvValue(["SMTP_PORT"]);
}

export function getSmtpSecure() {
  return getFirstEnvValue(["SMTP_SECURE"]) === "true";
}

export function getSmtpUser() {
  return getFirstEnvValue(["SMTP_USER"]);
}

export function getSmtpPass() {
  return getFirstEnvValue(["SMTP_PASS"]);
}

export function getFromName() {
  return getFirstEnvValue(FROM_NAME_ENV_KEYS) || "Aionsite";
}

export function getFromEmail() {
  return getFirstEnvValue(FROM_EMAIL_ENV_KEYS);
}

export function getCronSecret() {
  return getFirstEnvValue(CRON_SECRET_ENV_KEYS);
}

export function getAppSetupState() {
  const missingDatabaseEnv = getMissingEnvVars(DATABASE_ENV_KEYS);
  const missingGooglePlacesEnv = getMissingEnvVars(GOOGLE_PLACES_ENV_KEYS);
  const missingSmtpEnv = getMissingEnvVars(SMTP_ENV_KEYS);

  return {
    databaseConfigured: missingDatabaseEnv.length === 0,
    googlePlacesConfigured: missingGooglePlacesEnv.length === 0,
    smtpConfigured: missingSmtpEnv.length === 0,
    missingDatabaseEnv,
    missingGooglePlacesEnv,
    missingSmtpEnv,
  };
}

export function formatMissingEnvError(scope: string, keys: readonly string[]) {
  const missing = getMissingEnvVars(keys);

  if (!missing.length) {
    return "";
  }

  return `Configuracion incompleta para ${scope}: faltan ${missing.join(", ")}.`;
}
