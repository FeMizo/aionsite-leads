# 📋 Guía de Implementación - Paso a Paso

**Duración estimada:** 2-3 horas (incluye testing)

---

## ✅ Pre-requisitos

- [ ] Rama `develop` actualizada
- [ ] Google Places API key activa
- [ ] Base de datos de desarrollo
- [ ] Acceso a Prisma Studio

---

## 🎯 Paso 1: Actualizar `types.ts`

**Archivo:** `lib/types.ts`

### ¿Qué cambiar?

En tu tipo `ProspectCandidate`, agregar estos campos **al final** (antes del cierre):

```typescript
// 🆕 NUEVOS - Para signals de actividad
  hasRecentPhotos: boolean; // ¿Fotos en últimos 90 días?
  mostRecentPhotoDate: string | null; // ISO string
  photoCount: number; // Cuántas fotos tiene el negocio
  hasCompleteHours: boolean; // ¿Tiene horarios definidos?
  openingHours: OpeningHours | null; // Horarios + estado actual
  businessTypes: string[]; // [restaurant, bar, lunch_spot, etc]
```

También agregar tipo nuevo:

```typescript
export type OpeningHours = {
  weekdayText: string[]; // ["Monday: 8:00 – 18:00", ...]
  isOpen: boolean | null;
};
```

✅ **Resultado:** Ahora ProspectCandidate incluye datos de actividad.

---

## 🎯 Paso 2: Actualizar `lib/providers/google-places.ts`

**Archivo:** `lib/providers/google-places.ts`

### ¿Qué cambiar?

#### 2a. Fieldmask (línea ~17)

**Cambiar:**
```typescript
const DEFAULT_FIELD_MASK = [
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
].join(",");
```

**A esto:**
```typescript
const DEFAULT_FIELD_MASK = [
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
  // 🆕 NUEVOS
  "places.photos",
  "places.openingHours",
  "places.types",
].join(",");
```

#### 2b. Tipo `GooglePlace` (línea ~27)

Agregar después de `businessStatus?:`:

```typescript
  // 🆕 NUEVOS
  photos?: Array<{
    name: string;
    heightPx?: number;
    widthPx?: number;
    authorAttributions?: Array<{
      displayName?: string;
      uri?: string;
      photoUri?: string;
      publishTime?: string;
    }>;
  }>;
  openingHours?: {
    openNow?: boolean;
    periods?: Array<{
      open?: { day?: number; hour?: number; minute?: number };
      close?: { day?: number; hour?: number; minute?: number };
    }>;
    weekdayDescriptions?: string[];
  };
  types?: string[];
```

#### 2c. Agregar funciones auxiliares (antes de `mapGooglePlaceToProspect`)

Copiar y pegar desde `CODIGO_MEJORADO.ts`:
- `extractPhotoSignals()`
- `extractHourSignals()`

#### 2d. Actualizar `mapGooglePlaceToProspect()` (línea ~70)

**Antes del return, agregar:**

```typescript
  const photoSignals = extractPhotoSignals(place.photos);
  const hourSignals = extractHourSignals(place.openingHours);
```

**Agregar estos campos al return:**

```typescript
    // 🆕 NUEVOS
    hasRecentPhotos: photoSignals.hasRecentPhotos,
    mostRecentPhotoDate: photoSignals.mostRecentPhotoDate,
    photoCount: photoSignals.photoCount,
    hasCompleteHours: Boolean(hourSignals?.weekdayText?.length),
    openingHours: hourSignals,
    businessTypes: place.types || [],
```

✅ **Resultado:** Ahora extrae fotos, horarios y tipos adicionales.

---

## 🎯 Paso 3: Actualizar `lib/prospect-scoring.ts`

**Archivo:** `lib/prospect-scoring.ts`

### ¿Qué cambiar?

#### 3a. Agregar función `isBusinessActive()` (después de imports)

```typescript
export function isBusinessActive(prospect: Pick<
  ProspectScoreInput,
  "businessStatus" | "hasRecentPhotos" | "openingHours" | "userRatingCount" | "photoCount"
>): boolean {
  if (prospect.businessStatus === "CLOSED_PERMANENTLY") return false;
  if (prospect.businessStatus === "CLOSED_TEMPORARILY") return false;

  const hasRecentPhotos = prospect.hasRecentPhotos === true;
  const hasHours = Boolean(prospect.openingHours);
  const hasReviews = prospect.userRatingCount && prospect.userRatingCount > 5;
  const hasPhotos = prospect.photoCount && prospect.photoCount > 0;

  return (
    prospect.businessStatus === "OPERATIONAL" &&
    (hasRecentPhotos || hasHours || hasReviews || hasPhotos)
  );
}
```

#### 3b. Actualizar type `ProspectScoreInput`

Agregar después de `isMobileFriendly`:

```typescript
  | "businessStatus"      // 🆕
  | "hasRecentPhotos"    // 🆕
  | "photoCount"         // 🆕
  | "openingHours"       // 🆕
  | "mostRecentPhotoDate" // 🆕
```

#### 3c. Mejorar `scoreProspect()` 

**Encontrar el comentario `// 4. SEÑAL DE RATING`** y agregar DESPUÉS:

```typescript
  // 🆕 5. BUSINESS STATUS
  if (prospect.businessStatus === "OPERATIONAL") {
    score += 5;
  }

  // 🆕 6. FOTOS RECIENTES (muy importante)
  if (prospect.hasRecentPhotos === true) {
    score += 15;
  } else if (prospect.photoCount && prospect.photoCount > 0) {
    score += 5;
  }

  // 🆕 7. HORARIOS COMPLETOS
  if (prospect.openingHours?.weekdayText?.length > 0) {
    score += 5;
  }

  // 🆕 8. PENALIZAR ABANDONO
  const lacksSignals =
    !prospect.hasRecentPhotos &&
    !prospect.openingHours &&
    !reviewCount;

  if (lacksSignals) {
    score -= 10;
  }
```

#### 3d. Agregar constante nueva (al inicio, con otras MINIMUM_*)

```typescript
export const WHATSAPP_AUTO_SEND_SCORE = 80;
```

#### 3e. Mejorar `getPriority()` (opcional pero recomendado)

```typescript
export function getPriority(
  score: number,
  isActive: boolean = true
): ProspectPriority {
  if (!isActive) {
    return "bajo";
  }

  if (score >= 80) {
    return "alto";
  }

  if (score >= MINIMUM_QUALIFIED_PROSPECT_SCORE) {
    return "medio";
  }

  return "bajo";
}
```

✅ **Resultado:** Scoring ahora considera actividad del negocio (+15 puntos por fotos recientes).

---

## 🎯 Paso 4: Filtrado en Pipeline (Opcional pero recomendado)

**Archivo:** `lib/pipeline.ts`

### ¿Qué cambiar?

Encontrar donde se llama `searchBusinesses()` y filtrar resultado:

**Antes:**
```typescript
const { candidates } = await searchBusinesses(SEARCHES);
```

**Después:**
```typescript
const { candidates } = await searchBusinesses(SEARCHES);

// 🆕 Filtrar cerrados permanentemente
const activeCandidates = candidates.filter(p => 
  p.businessStatus !== "CLOSED_PERMANENTLY"
);
console.log(`[pipeline] Filtrado: ${candidates.length - activeCandidates.length} cerrados`);

// Usar activeCandidates en lugar de candidates
const deduped = deduplicateProspects(activeCandidates);
```

✅ **Resultado:** No gastas emails en negocios cerrados.

---

## 🚀 Paso 5: Testing

### 5a. Verificar cambios en el código

```bash
npm run build
# Debería compilar sin errores
```

### 5b. Ejecutar cron manualmente

**Opción A - Llamar API manualmente:**
```bash
curl -X POST http://localhost:2692/api/runs/execute \
  -H "Authorization: Bearer YOUR_INTERNAL_API_KEY" \
  -H "Content-Type: application/json"
```

**Opción B - En Prisma Studio:**
```bash
npm run db:studio
# Navegar a "Run" y crear un nuevo registro manualmente
```

### 5c. Verificar datos en BD

Abrir Prisma Studio:
```bash
npm run db:studio
```

Ir a tabla `Prospect` y verificar:

| Campo | Esperado |
|-------|----------|
| `businessStatus` | "OPERATIONAL", "CLOSED_PERMANENTLY", etc |
| `photoCount` | > 0 para activos |
| `hasRecentPhotos` | true/false |
| `openingHours` | JSON con weekdayText |
| `prospectScore` | Números más altos (75+) |

### 5d. Verificar logs

En terminal donde corre `npm run dev`:

```
[google-places] Buscando: dentistas en Merida
[google-places] dentistas en Merida: 15 resultados.
[pipeline] Filtrado: 3 cerrados
[prospect-scoring] Score 85 (alto): Clínica XYZ - Operacional + 2 fotos recientes
```

✅ **¡Si ves esto, está funcionando!**

---

## 📊 Paso 6: Analizar Impacto

**Query para ver mejoras:**

```sql
-- En Prisma Studio, hacer click en "Query"
-- O ejecutar manualmente:

SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN businessStatus = 'OPERATIONAL' THEN 1 ELSE 0 END) as operacionales,
  SUM(CASE WHEN hasRecentPhotos = true THEN 1 ELSE 0 END) as con_fotos_recientes,
  SUM(CASE WHEN prospectScore >= 75 THEN 1 ELSE 0 END) as ready_alto,
  AVG(prospectScore) as score_promedio
FROM "Prospect"
WHERE createdAt > NOW() - INTERVAL '1 day';
```

**Métricas esperadas:**
- Operacionales: 70-85% (el resto cerrado temporalmente o desconocido)
- Con fotos recientes: 50-70%
- Score promedio: +10-15 puntos vs antes

---

## ⚠️ Troubleshooting

### ❌ Error: "Unknown field: places.photos"

**Causa:** Google Places API no reconoce el campo.  
**Solución:** Verificar que `DEFAULT_FIELD_MASK` está correcto y API key es válida.

### ❌ Fotos sin fecha

**Causa:** Google no siempre proporciona `publishTime`.  
**Solución:** Asumir recientes si están en Google (código ya lo hace).

### ❌ Score no cambió

**Causa:** No ejecutaste `npm run build` después de cambios.  
**Solución:** 
```bash
npm run build
npm run dev
# Ejecutar cron de nuevo
```

### ❌ Prisma Studio muestra error de schema

**Causa:** Falta correr push del schema.  
**Solución:**
```bash
npm run db:push
```

---

## ✅ Checklist Final

- [ ] Actualicé `types.ts`
- [ ] Actualicé `google-places.ts` (fieldMask + funciones)
- [ ] Actualicé `prospect-scoring.ts` (isBusinessActive + scoring)
- [ ] Agregué filtrado en `pipeline.ts` (opcional)
- [ ] Ejecuté `npm run build` sin errores
- [ ] Ejecuté manual cron test
- [ ] Verifiqué datos en Prisma Studio
- [ ] Analicé métricas (% operacionales, score promedio)

---

## 🎉 Listo para Producción

Una vez validado en desarrollo:

```bash
git checkout -b feature/maps-scoring-v2
git add .
git commit -m "🎯 Mejorar parsing Maps & scoring con fotos + horarios"
git push origin feature/maps-scoring-v2
# Crear PR en GitHub
```

**Recomendación:** Deploy a staging (rama `develop`) primero, monitorear por 24h, luego a prod.

---

## 📚 Próximos Pasos (Fase 2)

1. ✅ Hoy: Implementar esto
2. 📱 Semana siguiente: Integrar WhatsApp (usar `phone` + `openingHours` para timing)
3. 🤖 Después: Automatizar envío WhatsApp a scores 80+ (WHATSAPP_AUTO_SEND_SCORE)

---

**¿Dudas? Revisa `CODIGO_MEJORADO.ts` para ver toda la implementación lista para copiar.**
