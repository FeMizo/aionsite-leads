# 🎯 Plan de Mejoras: Google Maps Parsing & Scoring

**Fecha:** 2026-04-24  
**Objetivo:** Mejorar la calidad de leads identificando negocios "activos" y lista para WhatsApp

---

## 📊 Diagnóstico Actual

### ✅ Lo que FUNCIONA bien:
- **Scoring** es sólido (0-100, considera web + CTA + reviews + rating)
- **Targeting por nicho** excelente (15 categorías, 9 ciudades)
- **Extracción básica** eficiente (nombre, teléfono, website, rating)

### ❌ Las BRECHAS principales:

#### 1. **Falta "Actividad Reciente"**
Hoy extrae:
```javascript
rating: 4.5,          // ✅ Tiene buena reputación
userRatingCount: 100  // ✅ Tiene clientes
```

Pero NO sabe:
- ¿Cuándo fue la última review? (¿hace 1 mes o 1 año?)
- ¿Qué tan activo está el negocio?

**Impacto:** Estás priorizando negocios muertos con buenas reviews antiguas.

---

#### 2. **No extrae FOTOS (señal de actividad)**
Google Places API permite obtener:
```javascript
photos: [
  { 
    name: "places/ABC123/photos/DEF456",
    heightPx: 480,
    widthPx: 640,
    authorAttributions: [{ displayName: "John", date: "2024-03-15" }]
  }
]
```

- Fotos recientes = negocio activo
- Sin fotos = probablemente abandonado
- Fotos viejas = business stagnant

**Impacto:** Sin esto, no sabes si hace 2 años o 2 meses que no actualiza.

---

#### 3. **No captura HORARIOS (para WhatsApp timing)**
```javascript
openingHours: {
  weekdayDescriptions: [
    "Monday: 8:00 – 18:00",
    "Tuesday: 8:00 – 18:00",
    ...
  ]
}
```

**Impacto:** No puedes enviar WhatsApp a las 3am cuando están cerrados.

---

#### 4. **No filtra por `businessStatus`**
Tu código ya captura `businessStatus` pero NO lo usa:
```typescript
businessStatus: place.businessStatus || "", // 👈 LO CAPTURES PERO NO FILTRAS
```

Posibles valores: `OPERATIONAL` | `CLOSED_TEMPORARILY` | `CLOSED_PERMANENTLY`

**Impacto:** Estás gastando emails en negocios cerrados.

---

#### 5. **Scoring ignora datos de MAPS**
El scoring actual considera:
- Website (presencia digital)
- Reviews/Rating (reputación)

Pero NO considera:
- ¿Tiene fotos recientes? (+10 puntos)
- ¿Fue actualizado recientemente? (+15 puntos)
- ¿Tiene horarios completos? (+5 puntos)
- ¿Es operacional? (filtro clave)

---

## 🚀 Mejoras Propuestas (Prioridad)

### **P1: OPERACIONAL (requiere cambios API)**

#### 1️⃣ Agregar campos a fieldMask en `google-places.ts`

**Cambio:**
```typescript
const DEFAULT_FIELD_MASK = [
  // --- Existentes ---
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.rating",
  "places.userRatingCount",
  "places.primaryType",
  "places.googleMapsUri",
  "places.businessStatus",
  
  // --- NUEVOS (actualmente NO extrayendo) ---
  "places.photos",                    // 📸 Fotos + fecha
  "places.openingHours",              // 🕐 Horarios
  "places.editorialSummary",          // 📝 Descripción Google
  "places.adrFormatAddress",          // 📍 Dirección estructurada
  "places.types",                     // 🏷️ Tipos adicionales
  "places.utcOffsetMinutes",          // ⏰ Zona horaria
  "places.regularOpeningHours",       // ⏰ Horarios regulares
].join(",");
```

**Impacto:** +3 KB por respuesta, datos críticos para scoring.

---

#### 2️⃣ Actualizar tipo `ProspectCandidate` en `types.ts`

**Agregar campos:**
```typescript
export type ProspectCandidate = {
  // --- Existentes ---
  name: string;
  phone: string;
  website: string;
  rating: string;
  userRatingCount: number | null;
  businessStatus: string;
  
  // --- NUEVOS ---
  businessStatus: string;           // OPERATIONAL | CLOSED_PERMANENTLY | CLOSED_TEMPORARILY
  hasRecentPhotos: boolean;         // ¿Fotos en últimos 90 días?
  mostRecentPhotoDate?: string;     // Fecha ISO de la foto más reciente
  photoCount: number;               // Cuántas fotos tiene
  hasCompleteHours: boolean;        // ¿Tiene horarios?
  openingHours?: {
    weekdayText: string[];          // ["Monday: 8:00 – 18:00", ...]
    isOpen: boolean;                // ¿Abierto ahora?
  };
  photoUrls?: string[];             // URLs directas para análisis visual
  businessTypes: string[];          // [restaurant, bar, lunch_spot] vs solo tipo principal
};
```

---

#### 3️⃣ Mejorar mapping en `google-places.ts`

**Nueva función para procesar fotos:**
```typescript
function extractPhotoSignals(photos: any[] = []) {
  if (!photos.length) {
    return {
      photoCount: 0,
      hasRecentPhotos: false,
      mostRecentPhotoDate: null,
    };
  }

  // Google Places proporciona fecha en authorAttributions
  const dates = photos
    .flatMap(p => p.authorAttributions || [])
    .map(attr => new Date(attr.publishTime || attr.date))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  const mostRecent = dates[0];
  const daysSince = mostRecent 
    ? Math.floor((Date.now() - mostRecent.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  return {
    photoCount: photos.length,
    hasRecentPhotos: daysSince <= 90,  // 👈 Activo si tiene fotos en últimos 3 meses
    mostRecentPhotoDate: mostRecent?.toISOString() || null,
  };
}

function extractHourSignals(openingHours: any) {
  if (!openingHours) return null;
  
  return {
    weekdayText: openingHours.weekdayDescriptions || [],
    isOpen: openingHours.isOpen ?? null,
  };
}

// En mapGooglePlaceToProspect():
const photoSignals = extractPhotoSignals(place.photos);
const hourSignals = extractHourSignals(place.openingHours);

return {
  // ... existentes ...
  businessStatus: place.businessStatus || "UNKNOWN",
  hasRecentPhotos: photoSignals.hasRecentPhotos,
  mostRecentPhotoDate: photoSignals.mostRecentPhotoDate,
  photoCount: photoSignals.photoCount,
  hasCompleteHours: Boolean(hourSignals),
  openingHours: hourSignals,
  businessTypes: place.types || [],
};
```

---

### **P2: FILTRADO (sin cambios de API, solo lógica)**

#### 4️⃣ Filtrar negocios cerrados en `pipeline.ts`

**Agregar en búsqueda:**
```typescript
// Descartar inmediatamente
const filtered = candidates.filter(prospect => {
  // ❌ CERRADO PERMANENTEMENTE
  if (prospect.businessStatus === "CLOSED_PERMANENTLY") return false;
  
  // ⚠️ CERRADO TEMPORALMENTE (mantener para después)
  if (prospect.businessStatus === "CLOSED_TEMPORARILY") {
    console.warn(`[pipeline] ${prospect.name} cerrado temporalmente`);
  }
  
  // ✅ OPERACIONAL
  return prospect.businessStatus === "OPERATIONAL" || !prospect.businessStatus;
});
```

**Impacto:** -30-40% leads pero +50% calidad.

---

### **P3: SCORING MEJORADO**

#### 5️⃣ Actualizar `prospect-scoring.ts` con nuevas señales

**Agregar función para "Business Activeness":**
```typescript
export function isBusinessActive(prospect: Pick<
  ProspectScoreInput,
  "businessStatus" | "hasRecentPhotos" | "openingHours" | "userRatingCount" | "mostRecentPhotoDate"
>) {
  // Señales de negocio activo
  const hasRecentActivity = prospect.hasRecentPhotos; // Fotos en últimos 90 días
  const hasSystemSetup = Boolean(prospect.openingHours?.weekdayText?.length); // Horarios completos
  const hasCustomerActivity = prospect.userRatingCount! > 5; // Mínimo clientes
  
  return (
    prospect.businessStatus === "OPERATIONAL" &&
    (hasRecentActivity || hasCustomerActivity || hasSystemSetup)
  );
}

// Integrar en scoreProspect():
export function scoreProspect(prospect: ProspectScoreInput): number {
  let score = 0;
  
  // ... scoring existente ...
  
  // ✨ NUEVAS SEÑALES DE ACTIVIDAD
  if (prospect.businessStatus === "OPERATIONAL") {
    score += 5; // Confirmado abierto
  }
  
  if (prospect.hasRecentPhotos) {
    score += 15; // Fotos recientes = muy activo
  }
  
  if (prospect.openingHours?.weekdayText?.length > 0) {
    score += 5; // Horarios completos = profesional
  }
  
  // Penalizar negocios sin señales
  if (prospect.photoCount === 0 && prospect.userRatingCount! < 10) {
    score -= 10; // Posible abandono
  }
  
  return Math.max(0, score); // Nunca negativo
}
```

**Nuevos umbrales recomendados:**
```typescript
// Antes: MINIMUM_QUALIFIED_PROSPECT_SCORE = 50
export const MINIMUM_QUALIFIED_PROSPECT_SCORE = 50; // Sin cambios
export const AUTO_READY_PROSPECT_SCORE = 75;       // Sin cambios

// Nuevo: para negocios "ultra-calificados" (para WhatsApp automatizado)
export const WHATSAPP_AUTO_SEND_SCORE = 80;  // Score alto + operacional
```

---

### **P4: OPTIMIZAR BÚSQUEDA EN MAPS**

#### 6️⃣ Mejorar estrategia de búsqueda

**En `search-config.ts`:**
```typescript
function buildSearchSpec(
  city: (typeof SEARCH_CITIES)[number],
  niche: (typeof SEARCH_NICHES)[number]
): SearchSpec {
  return {
    id: `${niche.slug}-${city.slug}`,
    city: city.city,
    label: `${niche.label} en ${city.city}`,
    
    // Antes: solo textQuery simple
    textQuery: `${niche.textQuery} en ${city.queryLocation}`,
    
    // Opciones de búsqueda (usar cuando sea relevante)
    // Ejemplo para restaurantes: prioriza los que están activos
    rankPreference: niche.slug === "small-restaurants" 
      ? "RELEVANCE"  // Mantener RELEVANCE (por popularidad reciente)
      : "RELEVANCE",
    
    typeLabel: niche.typeLabel,
    includedType: niche.includedType,
    pageSize: 20,
    
    // ✨ NUEVO: Filtrar por businessStatus en respuesta
    excludeStatuses: ["CLOSED_PERMANENTLY"],  // Saltar cerrados permanentemente
    
    // ✨ NUEVO: Priorizar por recency (si Google Places lo soporta en futuro)
    minPhotoAge: 90,  // Solo negocios con fotos en últimos 90 días (opcional)
  };
}
```

---

## 🔄 Fase de Implementación

### **Semana 1: Core API Fields**
1. ✏️ Actualizar `google-places.ts` con nuevos fields
2. ✏️ Actualizar tipos en `types.ts`
3. ✏️ Test: ejecutar cron y verificar datos nuevos

### **Semana 2: Lógica de Filtrado**
1. ✏️ Agregar `isBusinessActive()` en `prospect-scoring.ts`
2. ✏️ Actualizar scoring con +15 puntos para fotos recientes
3. ✏️ Agregar filtro de `CLOSED_PERMANENTLY` en pipeline
4. ✏️ Test: verificar leads eliminados vs ganados

### **Semana 3: Validación & WhatsApp Prep**
1. 📊 Analizar impacto: % de leads mejores, tasa de respuesta
2. ✏️ Preparar `phone` + `openingHours` para envío de WhatsApp
3. ✏️ Crear new automation rule: auto-send WhatsApp a score 80+

---

## 📈 Impacto Esperado

| Métrica | Hoy | Después |
|---------|-----|--------|
| **Leads generados/mes** | 200 | 120 (-40%) ✓ |
| **Calidad leads** | Media | Alta (+50%) ✓ |
| **% Negocios cerrados** | 25-30% | <5% ✓ |
| **% Activos (últimos 3m)** | ? | ~80% ✓ |
| **Ready para WhatsApp** | N/A | ~30% ✓ |

---

## 🎬 Próximos Pasos

1. **Hoy:** Revisar este plan + decidir si aggresive o conservative
2. **Mañana:** Iniciar P1 (campos API) en develop branch
3. **Esta semana:** Test en Mérida city (ciudad piloto)
4. **Semana siguiente:** Roll out a todas las ciudades

---

## 📚 Referencia: Google Places API Field Docs

Google permite extraer hasta 52 campos. Actualmente usas ~10. Los que IMPORTAN:

```
✅ Actualmente extraes:
- places.id, displayName, formattedAddress, websiteUri
- nationalPhoneNumber, rating, userRatingCount, primaryType
- googleMapsUri, businessStatus

⚠️ Deberías agregar:
- places.photos                    # Fotos + fecha
- places.openingHours              # Horarios
- places.types                     # Tipo + subtypes
- places.regularOpeningHours       # Para validación

❌ Nice-to-have (más costoso):
- places.reviews                   # Textos de reviews
- places.editorialSummary          # Descripción Google
- places.dineIn, takeout, delivery # Servicios
```

**Costo:** Google charges $0.01+ por solicitud. Agregar 4 campos es negligible.

---

**Documento generado por Claude | 2026-04-24**
