# aionsite-leads

Mini CRM interno para AionSite con:

- dashboard en Next.js
- generacion automatica de prospectos
- pipeline `generated -> prospects -> contacted`
- historial local en JSON
- envio de correos por SMTP

## Comandos

- `npm run dev`
- `npm run build`
- `npm run start`
- `node scripts/generateProspects.js`
- `node scripts/sendEmails.js`

## Flujo

1. `generateProspects.js` busca negocios y los guarda en `Generated`
2. desde la UI los apruebas a `Prospects`
3. desde `Prospects` envias correos
4. los exitosos pasan a `Contacted`
5. todos los movimientos quedan en `History`

## Persistencia

La fuente principal es:

- `data/crm-records.json`
- `data/history.json`

Y se mantienen proyecciones compatibles:

- `data/generated-prospects.json`
- `data/prospects.json`
- `data/contacted-prospects.json`
- `data/sent-log.json`
