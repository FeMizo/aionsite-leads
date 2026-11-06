# Seguimiento Leads — registro persistente

Automatización: leads-seguimiento-y-consultas.
Última ejecución: 2026-11-04, 13:01 America/Mexico_City.
Estado: implementado y probado localmente; pendiente de revisión y publicación.

## Alcance y entorno
- Únicamente aionsite-leads; rama main, base 91c505fa2c430bf4a34abd260f7a24ed5b425987.
- Instrucciones AGENTS.md recibidas en conversación; no se encontraron archivos AGENTS.md en el repositorio ni sus ancestros inspeccionados.
- Entorno de prueba identificado: Vitest Node, cliente de datos completamente simulado, prospectos sintéticos a/b. No se abrieron conexiones a bases de datos ni se leyeron secretos.
- Sin Jobs, outreach, SMTP, WhatsApp, mensajes, migraciones, push ni despliegues.
- Sin servidor local abierto. No se cambió la interfaz visual.
- Concurrencia: sin procesos de Next/Vitest asociados a este proyecto detectados; hash de dashboard.ts estable entre inspecciones. Bloqueo local .git/leads-seguimiento.lock adquirido para esta ejecución y liberado al cerrar. Otros procesos de Codex existen; no se puede descartar actividad externa que ignore el bloqueo.
- Cambios anteriores en investigación y resúmenes de envío conservados sin alteración.

## Mejora acotada: eliminar COUNT redundante en cargas completas del CRM
- Oportunidad reproducida: getAllDashboardProspects delegaba en getProspectsByStatuses sin paginación, que ejecutaba findMany y count aunque devolvía todos los resultados.
- Antes del cambio, tres pruebas nuevas fallaron: contador redundante en CRM, total no derivado del resultado y caso vacío.
- Ahora las solicitudes sin paginación calculan totalCount con items.length; las paginadas conservan COUNT completo, filtros y offset.
- No se modificaron filtros, selección de campos, orden, puntos de acceso ni autenticación. proxy.ts conserva sesión obligatoria para /dashboard. El modelo inspeccionado es de credencial única; esta ejecución no demuestra aislamiento multiusuario/organización ni introduce tal capacidad.

## Evidencia y límites
- before.json: 100 cargas sintéticas, 200 llamadas simuladas, 4.781 ms.
- after.json: 100 cargas sintéticas, 100 llamadas simuladas, 7.576 ms en ejecución final de suite completa.
- Reducción de llamadas en esta ruta: 50%. Los tiempos de simulación son ruidosos y no prueban aceleración real; la medición final fue mayor. Sin benchmark PostgreSQL ni afirmación de mejora de latencia en producción.
- tests.txt: 20 archivos, 86 pruebas aprobadas; incluye seis pruebas nuevas de consultas, paginación, filtros, orden y casos vacíos.
- build.txt: npm.cmd run build terminó con código 0; compilación, TypeScript y generación completados.
- git diff --check sin errores de contenido; avisos existentes de normalización CRLF.
- Archivos: lib/dashboard.ts; lib/__tests__/dashboard-query-count.test.ts. dashboard.patch conserva el cambio del módulo. Los demás archivos de esta carpeta son evidencia.
- Intentos: reproducción previa y una implementación, sin bloqueo. No se probó el servicio real por no contar con entorno de base de datos de prueba identificado.

## Pendientes priorizados y siguiente paso
1. Revisar campos nextAction, owner y nextFollowupAt: serializeProspect devuelve valores vacíos; contrastar con esquema y consumidores antes de cambiar. No implementado en esta ejecución.
2. Verificar búsqueda/filtros y selección al cambiar de página con datos sintéticos, sin modificar contactos reales.
3. Evaluar orden estable para fechas empatadas en paginación.
4. Medir consultas y tiempos con PostgreSQL propio de prueba cuando exista un entorno explícitamente identificado; mantener datos y permisos separados de producción.
5. Revisión humana y publicación pendientes. No publicar desde esta automatización.

Retomar leyendo este archivo, git status y los cambios locales antes de editar. Una sola mejora por ejecución; martes solo bugs y seguridad en entorno propio de prueba.

## Ejecución 2026-11-05, 13:04 America/Mexico_City

Estado: implementado y probado localmente, pendiente de publicar. Una mejora acotada: conservar datos de seguimiento ya guardados al serializar prospectos del dashboard.

- Base actual: 82e833832d8513bf023d86e76225c64c977b1a0f; main estaba ahead 1 al empezar. Se conservaron ese commit y todos los cambios locales anteriores.
- Releídas instrucciones de conversación y este registro. Búsqueda de AGENTS.md en repositorio y ancestros sin resultados. Comandos confirmados en package.json: npm.cmd test y npm.cmd run build.
- Concurrencia: bloqueo .git/leads-seguimiento.lock adquirido y liberado al finalizar; hash dashboard.ts estable E0997D8FC4CF753A174FDD08DF5B8FAE06A9C23F26C0D149A9331271A423987D antes de editar. Proceso Next en puerto 2666 identificado mediante proceso hijo como otro proyecto (AionSite); no se tocó. No se detectó proceso activo específico de Leads. El bloqueo solo coordina ejecuciones que lo respeten.
- Fallo reproducido antes del cambio: prueba con nextAction, owner y nextFollowupAt sintéticos recibía cadena vacía, cadena vacía y null. before-tests.txt conserva una prueba fallida y siete aprobadas.
- Causa confirmada: los tres campos existen en prisma/schema.prisma y en el selector de lib/prospects.ts, pero el selector de dashboard los omitía y serializeProspect devolvía valores fijos.
- Cambio: añadir los tres campos a DashboardProspectRecord y DASHBOARD_PROSPECT_SELECT; devolver sus valores guardados y convertir fecha opcional a ISO, manteniendo null.
- Archivos de implementación/pruebas: lib/dashboard.ts; lib/__tests__/dashboard-query-count.test.ts. Dos pruebas nuevas de datos presentes y ausentes; se conservan pruebas de consultas y paginación.
- Entorno: exclusivamente cliente Prisma simulado por Vitest, prospectos sintéticos a/b. Sin consultas ni modificaciones en bases reales. Sin tareas Jobs, SMTP, outreach, WhatsApp ni llamadas externas. Sin push, commit, merge, migración ni despliegue.
- Verificación final: 20 archivos y 88 pruebas aprobadas, exit 0; build completo con TypeScript y generación exit 0. Diff sin errores de espacio, solo avisos CRLF existentes. Una implementación, ningún bloqueo.
- Medición con 100 cargas simuladas: antes 100 llamadas / 2.256 ms; después 100 llamadas / 3.906 ms. Misma cantidad de consultas; no se afirma mejora de latencia. La corrección recupera exactitud y añade tres columnas a la selección, sin N+1. Son tiempos de mocks, no PostgreSQL.
- Revisadas conexiones: getAllDashboardProspects, getProspectsByStatuses y serializer compartido; no cambian filtros, autenticación, WHERE, estados ni alcance de datos. No se acredita aislamiento multiusuario/organización, que sigue fuera de lo verificado con este modelo de credencial única.
- Sin cambios visuales: los componentes inspeccionados todavía no presentan estos campos; no se añadió interfaz ni se afirma mejora visual. Se corrige la pérdida de datos en la capa de lectura.
- Evidencia recuperable: outputs/leads-seguimiento/2026-11-05/{before-tests.txt,before.json,after.json,tests.txt,build.txt,dashboard.patch}. El patch acumulado incluye la optimización local anterior, conservada.

Siguiente paso priorizado: comprobar filtros, búsqueda y selección al paginar con fixtures; luego orden estable con fechas empatadas. La revisión de los tres campos de seguimiento queda resuelta en la serialización; cualquier presentación futura requiere revisión visual propia. Continúa pendiente entorno PostgreSQL de prueba identificado para medición real. Publicación pendiente y prohibida desde esta automatización.
