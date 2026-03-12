const fs = require("fs");
const path = require("path");
const { dataPaths } = require("../utils/storage");
const {
  normalizeEmail,
  normalizeName,
  normalizePhone,
} = require("../utils/normalizers");

const CHAT_DIR = path.join(path.dirname(dataPaths.prospects), "chat");
const DEFAULT_PROMPT_PATH = path.join(CHAT_DIR, "prospect-request.txt");
const DEFAULT_RESPONSE_PATH = path.join(CHAT_DIR, "prospect-response.json");

function ensureChatDir() {
  fs.mkdirSync(CHAT_DIR, { recursive: true });
}

function summarizeExistingRecords(records) {
  const seen = new Set();
  const lines = [];

  for (const record of records) {
    const name = normalizeName(record.name);
    const email = normalizeEmail(record.email);
    const phone = normalizePhone(record.phone);
    const key = `${name}|${email}|${phone}`;

    if (!key.replace(/\|/g, "")) {
      continue;
    }

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    lines.push(
      [
        record.name || "(sin nombre)",
        email ? `email=${email}` : null,
        phone ? `phone=${phone}` : null,
        record.city ? `city=${record.city}` : null,
      ]
        .filter(Boolean)
        .join(" | ")
    );

    if (lines.length >= 60) {
      break;
    }
  }

  return lines;
}

function buildChatPrompt(options = {}) {
  const cities = Array.isArray(options.cities) ? options.cities : [];
  const requiredTypes = Array.isArray(options.requiredTypes)
    ? options.requiredTypes
    : [];
  const desiredCount = Number(options.desiredCount) || 6;
  const existingSummary = summarizeExistingRecords(options.existingRecords || []);

  return `Busca ${desiredCount} prospectos reales para ofrecer sitios web a negocios locales en Mexico.

Restricciones:
- Ciudades objetivo: ${cities.join(", ")}
- Debes entregar exactamente ${desiredCount} prospectos
- Debe incluir al menos 1 ${requiredTypes[0] || "Inmobiliaria"}
- Debe incluir al menos 1 ${requiredTypes[1] || "Restaurante"}
- Prioriza negocios con: sin sitio web, sitio viejo, solo redes sociales, inmobiliarias, restaurantes, clinicas y negocios locales
- No repitas negocios ya existentes

Campos requeridos por prospecto:
- name
- contactName
- city
- email
- phone
- type
- website
- rating
- opportunity
- recommendedSite
- pitchAngle
- source

Reglas de salida:
- Devuelve solo JSON valido
- Devuelve un arreglo de objetos
- No agregues markdown
- Si un dato no existe usa cadena vacia
- source debe explicar de donde salio el prospecto, por ejemplo: "chat:web-search"

Negocios que NO debes repetir:
${existingSummary.length ? existingSummary.map((line) => `- ${line}`).join("\n") : "- (sin registros previos)"}

Formato esperado:
[
  {
    "name": "",
    "contactName": "",
    "city": "",
    "email": "",
    "phone": "",
    "type": "",
    "website": "",
    "rating": "",
    "opportunity": "",
    "recommendedSite": "",
    "pitchAngle": "",
    "source": "chat:web-search"
  }
]`;
}

function writePromptFile(promptPath, content) {
  ensureChatDir();
  fs.writeFileSync(promptPath, content, "utf8");
}

function parseResponseFile(responsePath) {
  if (!fs.existsSync(responsePath)) {
    return null;
  }

  const raw = fs.readFileSync(responsePath, "utf8").trim();

  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(
      `[chatProvider] ${responsePath} debe contener un arreglo JSON de prospectos.`
    );
  }

  return parsed;
}

async function searchBusinesses(options = {}) {
  const promptPath = options.promptPath || DEFAULT_PROMPT_PATH;
  const responsePath = options.responsePath || DEFAULT_RESPONSE_PATH;
  const prompt = buildChatPrompt(options);

  writePromptFile(promptPath, prompt);
  const response = parseResponseFile(responsePath);

  if (!response) {
    throw new Error(
      `[chatProvider] No hay respuesta lista. Usa el prompt en ${promptPath} y guarda el JSON devuelto en ${responsePath}.`
    );
  }

  return response;
}

module.exports = {
  name: "chat",
  buildChatPrompt,
  defaultPromptPath: DEFAULT_PROMPT_PATH,
  defaultResponsePath: DEFAULT_RESPONSE_PATH,
  searchBusinesses,
};
