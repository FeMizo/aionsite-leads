# aionsite-leads

Pipeline de prospecting para AionSite reestructurado para `Next.js App Router`, `Vercel Functions`, `Vercel Cron` y `Postgres` con `Prisma`.

## Arquitectura

- `app/api/cron/route.ts`: ejecuta la corrida de busqueda
- `app/api/prospects/route.ts`: lista dashboard y acciones sobre prospectos
- `app/api/send/route.ts`: envio SMTP
- `app/dashboard/page.tsx`: dashboard operativo
- `lib/*`: capa de dominio, Prisma, scoring, dedupe y migracion legacy
- `providers/google-places.ts`: integracion con Google Places API
- `providers/email-finder.ts`: scraping ligero para encontrar emails
- `prisma/schema.prisma`: modelos y client Prisma
- `vercel.json`: cron cada 2 dias

## Modelos

- `Prospect`: fuente principal de datos
- `ContactEvent`: historial de eventos por prospecto
- `Run`: metricas por corrida, incluyendo requests a Google Places y fetches a websites

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
```

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
2. La corrida consulta Google Places, deduplica, busca emails y guarda 6 prospectos.
3. El dashboard muestra `generated`, `prospects`, `contacted` y `runs`.
4. Desde el dashboard puedes aprobar prospectos generados.
5. `POST /api/send` envia correos por SMTP y actualiza eventos.

## Despliegue en Vercel

1. Crea una base Postgres y copia `DATABASE_URL`.
2. En Vercel agrega las variables de entorno del bloque anterior.
3. Despliega el proyecto.
4. Ejecuta las migraciones en la base objetivo:

```bash
npm run db:deploy
```

5. Si necesitas llevar los datos legacy existentes a la nueva base:

```bash
npm run migrate:legacy
```

6. Verifica que `vercel.json` programe `/api/cron`.

## Notas

- El cron en `vercel.json` usa `0 9 */2 * *` y Vercel lo interpreta en UTC.
- Cada corrida guarda:
  - `googlePlacesRequests`
  - `websiteFetches`
  - `placesFound`
  - `duplicatesFiltered`
  - `emailsFound`
  - `prospectsSaved`
- La deduplicacion usa email, phone y name normalizado.
