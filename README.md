# aionsite-leads

Pipeline de prospecting para AionSite sobre `Next.js App Router`, `Vercel Functions`, `Postgres` y `Prisma`, con una capa de endpoints lista para integrarse con un Custom GPT via Actions/OpenAPI.

## Arquitectura

- `app/api/cron/route.ts`: endpoint legacy para cron y compatibilidad operativa.
- `app/api/prospects/route.ts`: compatibilidad con acciones del dashboard y listado protegido para integraciones.
- `app/api/prospects/[id]/*`: endpoints REST por prospecto para approve, reject, message, send y CRUD.
- `app/api/send/route.ts`: flujo SMTP legacy del dashboard.
- `app/api/runs/route.ts`: listado protegido de busquedas recientes.
- `app/api/runs/execute/route.ts`: ejecucion manual protegida para integraciones.
- `app/dashboard/page.tsx`: dashboard operativo.
- `lib/*`: capa de dominio, Prisma, scoring, dedupe, auth y helpers API.
- `providers/google-places.ts`: integracion con Google Places API.
- `providers/email-finder.ts`: scraping ligero para encontrar emails.
- `prisma/schema.prisma`: modelos y client Prisma.
- `openapi.yaml`: base para conectar un GPT con bearer auth.

## Modelos

- `Prospect`: fuente principal de datos.
- `ContactEvent`: historial de eventos por prospecto.
- `Run`: metricas por busqueda, incluyendo requests a Google Places y fetches a websites.

## Variables de entorno

Usa `.env` basado en `.env.example`:

```env
DATABASE_URL=
GOOGLE_MAPS_API_KEY=
GOOGLE_PLACES_ENDPOINT=https://places.googleapis.com/v1/places:searchText
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
FROM_NAME=Aionsite
FROM_EMAIL=contacto@aionsite.com.mx
CRON_SECRET=
INTERNAL_API_KEY=
```

Dependencias por modulo:

- `DATABASE_URL`: obligatorio para leer el dashboard, APIs CRUD, seed y migraciones.
- `GOOGLE_MAPS_API_KEY`: obligatorio para `/api/cron`, `/api/runs/execute` y busquedas manuales.
- `SMTP_*`: obligatorio para `/api/send` y `/api/prospects/{id}/send`.
- `INTERNAL_API_KEY`: obligatorio para los endpoints protegidos que usara el GPT.

## Correr en local

1. Instala dependencias:

```bash
npm install
```

2. Genera el cliente Prisma:

```bash
npm run prisma:generate
```

3. Crea o aplica migraciones:

```bash
npm run db:migrate
```

Si ya tienes una base objetivo creada y solo quieres aplicar lo versionado en el repo:

```bash
npm run db:deploy
```

4. Importa los JSON legacy a Postgres si quieres conservar el historial actual:

```bash
npm run migrate:legacy
```

5. Levanta la app:

```bash
npm run dev
```

El dashboard queda en `http://localhost:2692/dashboard`.

## Seed opcional

Si la base esta vacia y quieres importar automaticamente los JSON de `data/`:

```bash
npm run db:seed
```

## Flujo operativo

1. `GET /api/cron` corre por Vercel Cron cada 2 dias.
2. La busqueda consulta Google Places, deduplica, busca emails y guarda 6 prospectos.
3. El dashboard muestra `generated`, `prospects`, `contacted` y `runs`.
4. Desde el dashboard puedes aprobar prospectos generados, crear registros manuales y disparar correo SMTP.
5. El GPT o cualquier integracion autenticada puede listar, aprobar, rechazar, redactar mensajes, enviar y ejecutar busquedas por API.
6. Una integracion inbound puede registrar replies con `POST /api/prospects/{id}/reply`, lo que mueve el prospecto a `replied` y activa `hotLead=true`.

## Endpoints protegidos para GPT

Todos estos endpoints requieren:

```http
Authorization: Bearer YOUR_INTERNAL_API_KEY
```

### Prospectos

- `GET /api/prospects?status=prospect&limit=20`
- `POST /api/prospects`
  Crea un prospecto manual si envias body directo sin `action`.
- `GET /api/prospects/{id}`
- `PATCH /api/prospects/{id}`
- `DELETE /api/prospects/{id}`
- `POST /api/prospects/{id}/approve`
- `POST /api/prospects/{id}/reject`
- `POST /api/prospects/{id}/message`
- `POST /api/prospects/{id}/send`
- `POST /api/prospects/{id}/reply`

### Runs

- `GET /api/runs?limit=20`
- `POST /api/runs/execute`

## Endpoints legacy que se mantienen

- `GET /api/cron`
- `POST /api/cron`
- `POST /api/send`
- `POST /api/prospects` con `action`

Se conservan para no romper el dashboard ni el flujo operativo actual.

## Formato de respuesta JSON

Exito:

```json
{
  "ok": true,
  "items": []
}
```

Error:

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_STATUS",
    "message": "El parametro status no es valido.",
    "details": null
  }
}
```

Ejemplo de borrador:

```json
{
  "ok": true,
  "subject": "Hotel Demo: idea para captar mas clientes online",
  "message": "Hola equipo de Hotel Demo,...",
  "analysis": "El prospecto ya tiene website. El borrador enfoca la conversacion en rediseño, claridad de propuesta y mejora de conversion.",
  "opportunity": "su sitio actual puede captar mas leads de propiedades"
}
```

## Curl de prueba

Listar prospectos:

```bash
curl -X GET "http://localhost:2692/api/prospects?status=prospect&limit=10" \
  -H "Authorization: Bearer $INTERNAL_API_KEY"
```

Aprobar prospecto:

```bash
curl -X POST "http://localhost:2692/api/prospects/PROSPECT_ID/approve" \
  -H "Authorization: Bearer $INTERNAL_API_KEY"
```

Generar mensaje:

```bash
curl -X POST "http://localhost:2692/api/prospects/PROSPECT_ID/message" \
  -H "Authorization: Bearer $INTERNAL_API_KEY"
```

Enviar correo:

```bash
curl -X POST "http://localhost:2692/api/prospects/PROSPECT_ID/send" \
  -H "Authorization: Bearer $INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Idea rapida para mejorar su conversion",
    "message": "Hola,\n\nRevise su presencia digital y veo una oportunidad clara para modernizar su sitio y convertir mas visitas en contactos.\n\nSaludos,\nFelipe"
  }'
```

Ejecutar busqueda manual:

```bash
curl -X POST "http://localhost:2692/api/runs/execute" \
  -H "Authorization: Bearer $INTERNAL_API_KEY"
```

## OpenAPI y Custom GPT

1. Configura `INTERNAL_API_KEY` en tu entorno.
2. Publica o expone el proyecto.
3. Usa `openapi.yaml` como esquema base en Actions.
4. Configura autenticacion tipo bearer token con el mismo valor de `INTERNAL_API_KEY`.

El archivo `openapi.yaml` ya incluye:

- `bearerAuth`
- endpoints principales de prospectos y runs
- schemas base de exito y error

## Despliegue en Vercel

1. Crea una base Postgres accesible desde Vercel.
2. Agrega `DATABASE_URL`, `GOOGLE_MAPS_API_KEY`, `SMTP_*`, `CRON_SECRET` e `INTERNAL_API_KEY`.
3. Despliega el proyecto.
4. Ejecuta las migraciones versionadas:

```bash
npm run db:deploy
```

5. Si la base esta vacia y quieres cargar los JSON legacy:

```bash
npm run db:seed
```

## Notas

- El cron en `vercel.json` usa `0 9 */2 * *` y Vercel lo interpreta en UTC.
- El repo ya incluye `prisma/migrations`, por lo que `prisma migrate deploy` es reproducible.
- Si faltan variables, las APIs responden `503` con detalle claro en JSON.
- Se agrego el estado `rejected` para rechazar leads sin borrar su historial.
