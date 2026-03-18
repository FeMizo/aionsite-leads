const DATABASE_ENV_KEYS = ["DATABASE_URL"] as const;
const GOOGLE_PLACES_ENV_KEYS = ["GOOGLE_MAPS_API_KEY"] as const;
const SMTP_ENV_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"] as const;

function hasValue(key: string) {
  return Boolean(process.env[key]?.trim());
}

export function getMissingEnvVars(keys: readonly string[]) {
  return keys.filter((key) => !hasValue(key));
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
