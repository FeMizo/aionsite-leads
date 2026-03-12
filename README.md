# aionsite-leads

Mini CRM de prospeccion para Aionsite.

## Flujo

1. `node scripts/generateProspects.js`
2. `node scripts/sendEmails.js`

El generador produce 6 prospectos unicos por corrida y evita duplicados contra:

- `data/prospects.json`
- `data/contacted-prospects.json`
- `data/sent-log.json`

## Providers

- `providers/mockProvider.js`: provider funcional para pruebas
- `providers/googleMapsProvider.js`: placeholder para una integracion real
- `providers/webSearchProvider.js`: placeholder para una integracion real

## Datos

- `data/prospects.json`: pipeline activo con `pending`, `sent`, `replied`, `closed`
- `data/contacted-prospects.json`: historial resumido para no repetir leads
- `data/sent-log.json`: bitacora de envios y errores

## Variables opcionales

- `LEADS_PROVIDER=mock`
- `AIONSITE_DATA_DIR=./data`
