# AionSite Leads

Aplicación de uso interno para convertir información pública de negocios en oportunidades comerciales para AionSite: buscar, calificar, investigar, preparar propuestas, contactar y dar seguimiento. Incluye un espacio independiente para organizar vacantes laborales.

Este documento describe la implementación del repositorio. La disponibilidad de integraciones, las cuotas y el funcionamiento del despliegue requieren comprobación en el entorno correspondiente. No contiene nombres ni valores de variables de entorno, credenciales o datos personales.

## Qué permite hacer

| Función | Para qué sirve | Implementación principal | Configuración necesaria |
| --- | --- | --- | --- |
| Acceso inicial e inicio de sesión | Crear las credenciales del operador y proteger el dashboard. | `app/setup/`, `app/login/`, `app/api/auth/`, `lib/dashboard-auth.ts`, `lib/dashboard-session.ts`, `proxy.ts`. | PostgreSQL, secreto privado de firma y credenciales iniciales. |
| Inicio operativo | Consultar contadores, colas, búsquedas y disponibilidad de módulos. | `app/dashboard/page.tsx`, `components/dashboard/dashboard-sections.tsx`, `lib/dashboard.ts`. | Base de datos; integraciones adicionales según las acciones utilizadas. |
| Búsqueda de negocios | Encontrar candidatos por ciudad y giro mediante Google Places; complementar con perfiles sociales públicos. | `lib/pipeline.ts`, `lib/runs.ts`, `providers/google-places.ts`, `providers/social-search.ts`. | Acceso a Google Places y, para búsqueda social, Brave Search; catálogos, prioridades y límites de ejecución. |
| Extracción y deduplicación | Obtener correos públicos y evitar repetir candidatos por nombre, teléfono o correo normalizados. | `providers/email-finder.ts`, `lib/dedupe.ts`, `lib/normalizers.ts`. | Acceso de red a los sitios consultados y registros existentes en Postgres. |
| Evaluación comercial | Priorizar negocios por ajuste, urgencia, contactabilidad, actividad y señales de presencia digital. | `lib/prospect-scoring.ts`, `lib/website-signals.ts`, `lib/opportunity.ts`, `lib/review-analysis.ts`. | Datos públicos y reglas de puntuación del código. |
| CRM y acciones por lote | Consultar etapas, ordenar, buscar, paginar, aprobar, rechazar, preparar mensajes y cambiar estados. | `components/dashboard/crm-workspace.tsx`, `components/dashboard/prospect-table.tsx`, `lib/prospects.ts`. | Base de datos y acceso al dashboard. |
| Alta manual | Incorporar un negocio, calcular su puntuación y preparar un borrador cuando tiene correo. | `components/dashboard/manual-prospect-panel.tsx`, `lib/manual-prospects.ts`, `lib/prospects.ts`. | Datos del negocio y base de datos. |
| Ficha del prospecto | Revisar contacto, oportunidad, puntuación, mensajes, fechas e historial. | `app/dashboard/prospects/[id]/`, `lib/prospects.ts`. | Prospecto existente y sesión del dashboard. |
| Contacto manual | Abrir WhatsApp o el cliente de correo con texto preparado. | `app/dashboard/prospects/[id]/manual-contact-actions.tsx`, `components/dashboard/prospect-table.tsx`, `lib/contact-links.ts`. | Teléfono o correo válido y aplicación de contacto disponible. |
| Borradores y plantillas | Preparar primer contacto y seguimientos en español, inglés, portugués o italiano, con variantes de mensaje y vista previa HTML. | `lib/outreach.ts`, `lib/email-template.ts`, `lib/prospect-language.ts`, `app/dashboard/prospects/[id]/email-preview.tsx`. | Información del prospecto; no requiere un proveedor de IA para las plantillas actuales. |
| Envío y prueba SMTP | Enviar correos desde la aplicación y comprobar el transporte sin crear un prospecto de prueba. | `app/api/send/`, `lib/mailer.ts`, formulario manual en modo SMTP. | Servidor de correo, puerto, seguridad, autenticación e identidad del remitente. |
| Programación y seguimientos | Distribuir contactos por fecha, giro y zona horaria, respetando presupuesto de envíos. | `lib/send-scheduler.ts`, `lib/send-windows.ts`, `lib/prospect-timezone.ts`, `lib/mailer.ts`. | Correo saliente, base de datos y un ejecutor de tareas periódicas. |
| Respuestas y oportunidad activa | Registrar respuestas, clasificarlas, cancelar programación y marcar interés comercial. | `app/api/prospects/[id]/reply/`, `lib/prospects.ts`, `lib/crm-prompts.ts`. | Integración entrante o registro mediante API; no hay lector general de respuestas implementado por IMAP. |
| Aperturas y clics | Añadir enlaces con tokens cifrados y autenticados y guardar eventos asociados al prospecto. | `lib/email-tracking.ts`, `lib/email-tracking-events.ts`, `app/api/tracking/`. | Secreto independiente de seguimiento y dirección pública HTTPS en producción. |
| Detección de rebotes | Leer notificaciones de entrega fallida y mover contactos a sin poder contactar. | `lib/mail-bounces.ts`. | Acceso IMAP al buzón; puede reutilizar autenticación del correo saliente. |
| Investigación revisable | Comparar información actual con fuentes públicas y aprobar o descartar cada propuesta. | `providers/prospect-research.ts`, `lib/prospect-research.ts`, `components/dashboard/prospect-research-review.tsx`. | Google Places, Brave Search y acceso al sitio, según las fuentes consultadas; sesión del dashboard. |
| Rastreo y reportes | Solicitar una revisión a Crawl Site, consultar estado, conservar historial y descargar PDF. | `providers/crawl-site.ts`, `lib/prospect-crawls.ts`, `components/dashboard/prospect-crawl-history.tsx`. | Servicio Crawl Site accesible, autenticación del servicio y sitio válido; HTTPS en producción. |
| Analítica comercial | Comparar prospectos, respuestas e interesados por ciudad, giro, fuente, versión de prompt y oferta. | `lib/crm-analytics.ts`, `app/dashboard/analytics/`, `app/api/analytics/`. | Datos comerciales registrados en Postgres. |
| Exportación Excel | Descargar información de contacto, evidencia, reseñas, puntuaciones y próxima acción. | `lib/prospect-export.ts`, `app/api/exports/prospects/`. | Base de datos; sesión o autenticación de integración. |
| Jobs | Organizar vacantes, revisar encaje y salario, copiar carta y abrir la postulación externa. | `components/dashboard/jobs-workspace.tsx`, `lib/jobs.ts`, `lib/job-status.ts`, `app/api/jobs/`. | Vacantes importadas, perfil y criterios almacenados en Postgres; archivo local para contingencia. |
| Integración externa | Consultar y operar prospectos y búsquedas desde clientes autorizados, incluido un Custom GPT. | `app/api/`, `lib/auth.ts`, `lib/api.ts`, `openapi.yaml`. | Autenticación privada de integración y servidor accesible. |
| Respaldo e importación | Conservar una copia operativa e incorporar datos históricos de prospectos o Jobs. | `scripts/backup-data.ts`, `scripts/migrate-legacy.ts`, `scripts/migrate-jobs.ts`, `prisma/seed.ts`. | Archivos fuente y destino privado; base disponible para exportar o importar datos de Postgres. |
| WhatsApp mediante navegador | Ejecutar un flujo local de contacto separado de los enlaces manuales del dashboard. | `scripts/whatsapp-outreach.ts`. | Navegador compatible con Playwright y sesión activa de WhatsApp Web. |

## Flujo comercial implementado

1. Se ejecuta una búsqueda manual o programada, o se captura un prospecto manualmente.
2. La búsqueda consulta fuentes públicas, normaliza candidatos, elimina duplicados, revisa sitios y calcula señales comerciales.
3. Guarda prospectos y métricas de ejecución. La meta es hasta 20 prospectos; se prioriza un canal de contacto, que puede ser correo, teléfono o llamada a contacto detectada. Si la selección no llega a 15, se completa con candidatos disponibles, incluso con puntuación baja o sin canal. Estas cantidades son objetivos, no garantías.
4. La puntuación puede asignar aprobación automáticamente. Los flujos de preparación pueden generar borrador y programar candidatos elegibles; no todas las entradas esperan una aprobación manual independiente.
5. El operador revisa información, mensajes y programación, o cambia el estado mediante las acciones disponibles.
6. El ejecutor de envíos procesa contactos y seguimientos elegibles, registra el resultado y consulta rebotes.
7. Una respuesta registrada por API cambia el estado a respondió, activa la marca de oportunidad y elimina la fecha de envío pendiente.
8. El cierre y los ingresos alimentan la analítica a partir de los datos registrados.

Las búsquedas también registran solicitudes al proveedor, sitios consultados, duplicados, correos encontrados, prospectos guardados y errores. Una ejecución puede terminar completada, con advertencias por cuota o fallida.

### Estados y alcance de los datos

Los estados persistidos de prospectos son generado, analizado, aprobado, listo para enviar, contactado, segundo intento, respondió, seguimiento, cliente, rechazado y sin poder contactar. Programado es una presentación de un registro listo con fecha futura; no constituye un estado adicional del modelo.

La API permite editar información comercial adicional: responsable, evidencia, dolor principal, oferta recomendada, siguiente acción, fecha de seguimiento, categoría de respuesta, fechas de reunión, propuesta y cierre e ingresos. Su existencia en el modelo o la API no significa que todos estos campos tengan un formulario dedicado en la interfaz.

Eliminar por la API realiza un rechazo lógico y conserva el historial; no borra físicamente el prospecto.

### Puntuación y evidencia

La puntuación separa ajuste, urgencia, contactabilidad y actividad. Considera sitio ausente o básico, perfiles sociales, fallos y tiempo de carga, llamadas a contacto, declaración de vista móvil, reseñas y estado del negocio. Es una priorización basada en reglas, no una auditoría completa del sitio.

El análisis de reseñas usa coincidencias de palabras sobre la muestra disponible, de hasta cinco reseñas de Google Places. Las fortalezas y debilidades necesitan revisión. Las respuestas del propietario no se confirman con estos datos y se señalan para verificación manual.

El catálogo de ciudades, giros, prioridades y entradas habilitadas vive en `lib/search-targets.ts`. Las combinaciones y límites de búsqueda están en `lib/search-config.ts`. La configuración privada permite sustituir o ampliar catálogos y ajustar límites sin publicar sus valores. El catálogo incluye México, Estados Unidos, España, Portugal e Italia; las consultas se ordenan por prioridad y se recortan al límite de cada ejecución, por lo que una ciudad habilitada no necesariamente participa en cada búsqueda.

La prioridad es alta a partir de 80 puntos, media desde 50 y baja por debajo de 50. La selección principal parte de 35 puntos; la aprobación automática utiliza 50 y la preparación automática 40, con requisitos adicionales de contacto y borrador. Estos umbrales tienen propósitos distintos.

## Pantallas y navegación

| Ruta | Función |
| --- | --- |
| `/` | Redirección al dashboard. |
| `/setup` | Configuración inicial de credenciales. |
| `/login` | Inicio de sesión. |
| `/dashboard` | Resumen operativo. |
| `/dashboard/crm` | Todas las etapas del CRM, incluidos segundo intento, clientes y rechazados. |
| `/dashboard/generated` | Generados y analizados. |
| `/dashboard/prospects` | Aprobados. |
| `/dashboard/send` | Listos para enviar. |
| `/dashboard/scheduled` | Programados. |
| `/dashboard/contacted` | Contactados. |
| `/dashboard/followup` | Seguimiento. |
| `/dashboard/replied` | Respuestas. |
| `/dashboard/uncontactable` | Sin poder contactar. |
| `/dashboard/prospects/{id}` | Ficha, vista previa, historial, investigación y rastreo. |
| `/dashboard/runs` | Búsquedas y resultados. |
| `/dashboard/analytics` | Analítica y descarga Excel. |
| `/dashboard/jobs` | Vacantes, filtros por estado y tablero. |

La barra lateral agrupa Inicio, Prospectos, Jobs y Operación. Algunas pantallas existen sin un enlace directo permanente en la barra lateral; las etapas también se consultan desde el CRM.

Las tablas de prospectos ofrecen búsqueda de texto, ordenación por columnas, selección, paginación y panel de detalle. Las acciones disponibles dependen de la etapa. Jobs añade vista de lista o tablero, arrastre entre estados, detalle de vacante y cambios por lote.

### Contacto manual y prueba de correo

Abrir WhatsApp prepara una conversación; el operador completa el envío. Abrir el cliente de correo desde la ficha marca el prospecto como contactado antes de abrir la aplicación: esa marca no confirma entrega. El envío SMTP registra su resultado por separado.

La prueba SMTP utiliza los datos del formulario, envía un correo real y no crea un prospecto. Debe revisarse el destinatario antes de utilizarla.

## Configuración por capacidad

La configuración técnica se suministra de forma privada al entorno de ejecución, utilizando la plantilla del repositorio como referencia. No debe copiarse al README ni incorporarse a archivos públicos o al navegador.

| Capacidad | Requisitos de configuración |
| --- | --- |
| Aplicación y sesión | Conexión PostgreSQL, secreto privado compartido por la API y la firma de sesiones, usuario inicial de al menos 3 caracteres y contraseña de al menos 12. |
| Google Places | Cuenta y acceso habilitado al servicio, credencial válida y cuota disponible. |
| Búsqueda social | Acceso a Brave Search; su ausencia limita las funciones que dependen de esa fuente. |
| Correo saliente | Host, puerto, modo seguro, autenticación y remitente autorizado. |
| Rebotes | Buzón accesible por IMAP con puerto y modo seguro adecuados. |
| Seguimiento de correo | Dirección pública del sitio y secreto de al menos 32 caracteres; HTTPS en producción. |
| Crawl Site | Dirección del servicio, autenticación válida, acceso al sitio objetivo y disponibilidad de reportes PDF. |
| Automatización | Secreto para tareas programadas y ejecución periódica configurada en el alojamiento o un planificador externo. |
| Jobs local | Archivo JSON compatible; para editarlo, habilitación explícita de escritura local y destino autorizado. |
| Respaldos | Directorio privado fuera del repositorio y espacio suficiente. |
| WhatsApp local | Navegador y perfil autenticado o conexión a una sesión de navegador existente. |

Si falta configuración, cada módulo puede informar indisponibilidad o error; configurar solo la base no habilita búsquedas, correo o rastreos externos.

## Correo y tareas programadas

`vercel.json` declara los horarios del despliegue:

| Tarea | Endpoint | UTC | Ciudad de México |
| --- | --- | --- | --- |
| Búsqueda de prospectos | `/api/cron` | Lunes, miércoles y viernes a las 15:00. | Lunes, miércoles y viernes a las 09:00. |
| Envíos programados y rebotes | `/api/send/scheduled` | Todos los días a las 16:00. | Todos los días a las 10:00. |

Levantar el servidor local no ejecuta estas tareas automáticamente. Su despliegue y ejecución efectiva deben comprobarse en el alojamiento.

El envío programado elige una meta de 2 a 5 correos y comparte presupuesto entre contactos iniciales y seguimientos. Los límites actuales son 5 por ejecución y 30 por día; la programación admite hasta 3 por franja y tiene una meta diaria propia de 5. Los envíos dependen de fechas, elegibilidad, giro, zona horaria y ventanas configuradas en el código.

La secuencia contempla tres seguimientos con esperas mínimas de 3, 5 y 15 días según la etapa. Un único disparo diario puede no coincidir con todas las ventanas de negocios; una fecha guardada no garantiza envío a esa hora exacta.

Los correos usan plantillas HTML y texto, idioma y variantes de primer contacto. Pueden incorporar hallazgos y un PDF disponible de Crawl Site. Los enlaces comerciales y elementos de marca se mantienen en las plantillas del código. La selección de idioma utiliza el idioma almacenado del prospecto; el alta manual puede inferirlo de la ciudad. Los textos generales de marca y los resúmenes de rastreo conservan partes en español.

Cuando el prospecto tiene una referencia de rastreo, el envío exige un registro local completado con su PDF guardado; un reporte pendiente, ausente o incompleto bloquea el correo. Sin esa referencia, el adjunto no es obligatorio. La búsqueda puede iniciar un rastreo externo y guardar únicamente su referencia: eso no equivale a tener el PDF en el historial local.

La interfaz informa envíos, programación, bloqueos y fallos parciales por separado. La aceptación por el transporte SMTP no garantiza entrega o lectura; los eventos de rebote son un seguimiento posterior.

El seguimiento utiliza tokens cifrados y autenticados. Guarda una apertura por mensaje y el primer clic por destino normalizado, sin parámetros ni fragmento; enlaces que solo difieren en sus parámetros comparten el mismo evento. Las aperturas son aproximadas por los bloqueos y precargas de imágenes de los clientes de correo. El escaneo IMAP identifica rebotes y los registra en el historial; no sustituye una bandeja de entrada ni registra automáticamente todas las respuestas humanas.

## Investigación y Crawl Site

La investigación consulta Google Places, Brave Search y el sitio disponible. Guarda el estado de cada fuente, diferencias detectadas, URL de origen, confianza y motivo. El operador aprueba o descarta cada hallazgo; las decisiones quedan auditadas. Si el dato cambió desde la investigación, se detecta como desactualizado para evitar aplicar una propuesta sobre información distinta.

El rastreo valida y normaliza el sitio antes de solicitar la revisión externa. Conserva estados pendiente, en curso, completado o fallido, referencias del servicio, propietario, resumen y PDF. La interfaz permite consultar estado, reintentar o volver a revisar. El reporte se descarga desde el historial privado del prospecto. El conector solicita una revisión limitada a cinco páginas desde el sitemap, en español; valida el tipo y cabecera del PDF y rechaza archivos mayores a 8 MiB. Los enlaces de contacto, redes sociales y acortadores bloqueados no se aceptan como sitio a rastrear.

El resumen comercial utiliza hasta tres hallazgos respaldados y explica el alcance de las páginas revisadas. No garantiza mejoras de posicionamiento, visitas o ventas.

## Jobs

El módulo almacena empresa, puesto, salario, moneda y rango disponible, zona, región, fuente, enlace, tecnologías, motivo de encaje, carta, notas y fechas. Permite buscar, ordenar, filtrar, seleccionar por lote, copiar la carta y abrir el sitio de postulación.

Sus estados son pendiente, por aplicar, aplicado, omitido, fuera de planes, no disponible, seguimiento, en espera, rechazado, bloqueado y guardado para después.

El perfil, criterios y fecha de última búsqueda se leen de los datos almacenados. La aplicación no implementa una búsqueda autónoma de vacantes ni el envío de postulaciones: estos registros se incorporan por importación o mantenimiento externo.

Cuando Postgres no responde, el módulo puede leer un JSON local. La escritura de estados requiere habilitación explícita, crea respaldo y reemplaza el archivo de forma atómica. La escritura local está deshabilitada en Vercel; un archivo temporal no sustituye una base persistente. Este mecanismo cubre Jobs y no recupera el CRM, la autenticación o el correo.

## API y permisos reales

| Métodos | Ruta | Operación | Acceso implementado |
| --- | --- | --- | --- |
| POST | `/api/auth/setup` | Crear credenciales iniciales. | Solo mientras no existan credenciales. |
| POST | `/api/auth/login` | Validar credenciales y crear sesión. | Usuario y contraseña. |
| GET | `/api/prospects` | Listar y filtrar prospectos. | Autenticación privada de integración. |
| POST | `/api/prospects` | Crear prospecto o ejecutar acciones por lote. | Alta directa con autenticación; las acciones heredadas no comprueban autenticación en este controlador. |
| GET, PATCH, DELETE | `/api/prospects/{id}` | Consultar, editar o rechazar lógicamente. | Autenticación privada de integración. |
| POST | `/api/prospects/{id}/approve` | Aprobar y, cuando corresponde, programar. | Autenticación privada de integración. |
| POST | `/api/prospects/{id}/reject` | Rechazar. | Autenticación privada de integración. |
| POST | `/api/prospects/{id}/message` | Generar o guardar borrador. | Autenticación privada de integración. |
| POST | `/api/prospects/{id}/send` | Enviar correo individual. | Autenticación privada de integración. |
| POST | `/api/prospects/{id}/reply` | Registrar y clasificar respuesta. | Autenticación privada de integración. |
| GET, POST | `/api/prospects/{id}/research` | Historial e inicio de investigación. | Sesión del dashboard. |
| PATCH | `/api/prospects/{id}/research/{findingId}` | Aprobar o descartar hallazgo. | Sesión del dashboard. |
| GET, POST | `/api/prospects/{id}/crawl` | Historial, PDF, inicio o consulta de rastreo. | Sesión del dashboard. |
| GET | `/api/runs` | Listar búsquedas. | Autenticación privada de integración. |
| POST | `/api/runs/execute` | Ejecutar búsqueda manual. | Autenticación privada de integración. |
| POST | `/api/send` | Envío inicial, seguimientos, ambos o prueba SMTP. | Autenticación privada de integración. |
| GET | `/api/send/scheduled` | Cadencia y ejecución programada. | Autenticación privada del planificador. |
| GET, POST | `/api/cron` | Ejecutar búsqueda. | Autenticación privada del planificador. |
| GET | `/api/analytics` | Agregados comerciales. | Autenticación privada de integración. |
| GET | `/api/prompts` | Catálogo de prompts versionados. | Autenticación privada de integración. |
| GET | `/api/exports/prospects` | Descargar Excel. | Sesión o autenticación privada de integración. |
| GET, POST | `/api/jobs` | Leer vacantes o cambiar estados. | Sin comprobación de autenticación en el controlador actual. |
| GET | `/api/tracking/open` | Pixel de apertura. | Token cifrado y autenticado del mensaje para registrar el evento. |
| GET | `/api/tracking/click` | Registrar clic y redirigir. | Token cifrado y autenticado y destino HTTP o HTTPS validado. |

La protección de `proxy.ts` se aplica a las páginas del dashboard. No cubre automáticamente todas las rutas API; debe respetarse el acceso específico descrito arriba.

Las acciones por lote permiten aprobar seleccionados o todos los generados, generar borradores, rechazar, marcar contacto manual, cambiar estado, marcar cliente y crear manualmente. Los cambios se registran en eventos.

Las rutas principales devuelven indicador de éxito y datos, o error con código, mensaje y detalle. Investigación, rastreo, seguimiento y descargas tienen respuestas propias. El listado de prospectos acepta estado persistido y límite positivo.

`openapi.yaml` es una base parcial para integraciones y Actions de Custom GPT. No cubre todas las operaciones o campos actuales y debe contrastarse con los controladores antes de importarlo. El catálogo de prompts es una colección de instrucciones reutilizables; no ejecuta por sí mismo un modelo de IA.

## Arquitectura e implementación

- Interfaz: Next.js 16 App Router, React 19, TypeScript y CSS propio. Navegación agrupada, formularios, tablas, paneles de detalle y tablero de Jobs.
- Servidor: páginas dinámicas y controladores HTTP. La lógica de negocio reside en `lib/`; los conectores externos, en `providers/`.
- Persistencia: PostgreSQL con Prisma 7 y adaptador PostgreSQL. Cliente generado en `generated/prisma`; conexión y configuración centralizadas en `lib/db.ts`, `lib/env.ts` y `prisma.config.ts`.
- Datos: prospectos, eventos de contacto, ejecuciones, rastreos, investigaciones y hallazgos, credenciales, vacantes y configuración de Jobs.
- Autenticación: contraseñas con hash scrypt y sesiones firmadas de siete días mediante cookie; autenticación independiente para integraciones y tareas programadas.
- Correo: Nodemailer para envío; ImapFlow y Mailparser para rebotes; seguimiento propio de enlaces y aperturas.
- Archivos: ExcelJS para exportación; reportes PDF obtenidos del servicio Crawl Site y almacenados con el rastreo.
- Calidad: Vitest en entorno Node, pruebas en `lib/__tests__/` y `providers/__tests__/`, TypeScript estricto y compilación de Next.js.

## Desarrollo local

Requisito declarado: Node.js 20.9 o superior y npm. Las versiones y rangos efectivos están en `package.json` y el archivo de dependencias bloqueadas.

1. Instala dependencias con `npm install`.
2. Prepara la configuración privada a partir de la plantilla del proyecto, sin versionar credenciales. Habilita base de datos y firma de sesión para el acceso normal.
3. Ejecuta `npm run prisma:generate`.
4. Aplica migraciones existentes con `npm run db:deploy`. Para crear cambios de esquema en desarrollo, usa `npm run db:migrate` y regenera explícitamente el cliente.
5. Ejecuta `npm run dev` y abre `http://localhost:2692/setup` para el alta inicial; después utiliza `/login`.
6. Activa y verifica cada integración según la tabla de configuración antes de utilizar sus funciones.

Los cambios de modelo se realizan en `prisma/schema.prisma`, acompañados de migración y regeneración del cliente. Generar el cliente no aplica cambios en la base. [Referencia de Prisma](https://github.com/prisma/orm/blob/7.10.0/README.md).

Para añadir una función, actualiza la capa de dominio, el controlador correspondiente, la interfaz y los tipos compartidos. Añade una migración si cambia persistencia y pruebas de comportamiento cuando corresponda. Actualiza el contrato OpenAPI si la operación se ofrece a integraciones.

### Comandos disponibles

| Comando | Efecto |
| --- | --- |
| `npm run dev` | Desarrollo en puerto 2692. |
| `npm run build` | Generar cliente Prisma y compilar la aplicación. |
| `npm start` | Servir la compilación con el puerto de producción configurado. |
| `npm test` | Ejecutar Vitest. |
| `npx tsc --noEmit` | Comprobar tipos de los archivos incluidos por TypeScript. |
| `npm run prisma:generate` | Generar el cliente de base de datos. |
| `npm run db:migrate` | Crear y aplicar migraciones durante desarrollo. |
| `npm run db:deploy` | Aplicar migraciones versionadas a la base objetivo. |
| `npm run db:push` | Sincronizar el esquema directamente; no genera una migración versionada. |
| `npm run db:studio` | Explorar la base de datos. |
| `npm run db:seed` | Ejecutar importación opcional de datos históricos. |
| `npm run migrate:legacy` | Importar historial JSON de prospectos. |
| `npm run migrate:jobs` | Importar vacantes desde el JSON del proyecto AionSite vecino. |
| `npm run backup:data` | Crear copia operativa fuera del repositorio. |
| `npm run send:reschedule` | Recalcular programación guardada. |
| `npm run send:followups:preview` | Consultar seguimientos pendientes sin enviarlos. |
| `npm run send:followups` | Enviar seguimientos reales. |
| `npm run outreach:whatsapp` | Enviar mensajes reales desde el navegador local. |
| `npm run schema:json` | Imprimir estructura JSON de modelos y enumeraciones de Prisma; no genera OpenAPI. |

La plantilla de configuración puede no estar disponible en una copia del repositorio: las reglas de exclusión abarcan los archivos de entorno. Si falta, prepara la configuración de forma privada usando los requisitos por capacidad y los lectores de configuración del código; no publiques sus contenidos.

No hay un comando de lint declarado en `package.json`. La configuración de TypeScript excluye `scripts/`, `services/` y el archivo de ejemplo `CODIGO_MEJORADO.ts`; el chequeo de tipos general no valida esas herramientas.

Los scripts auxiliares de regeneración de borradores y actualización de PDF tienen modo de consulta y aplicación explícita. El actualizador de PDF está ligado a una ficha concreta, por lo que no es una herramienta general. Los scripts sueltos de análisis histórico no forman parte de los comandos operativos declarados y necesitan revisión de compatibilidad antes de ejecutarse.

### Validación de cambios

Para cambios de lógica, ejecuta las pruebas relevantes y el chequeo de tipos; para cambios que afecten compilación o interfaz, verifica además `npm run build` y las pantallas afectadas. Las pruebas simuladas no confirman acceso real a proveedores, entrega de correo o funcionamiento de un despliegue.

Comprueba por separado los flujos que modifican datos o envían mensajes usando un entorno y destinatarios de prueba autorizados. Un cambio documental no requiere ejecutar envíos, rastreos o migraciones reales.

## Respaldo y recuperación

El respaldo operativo copia el JSON local de Jobs y, cuando la base responde, exporta vacantes, configuración de Jobs, prospectos, eventos y búsquedas. Produce un manifiesto con resultado y comprobación del archivo local.

No incluye credenciales del dashboard, registros de rastreo, PDF, investigaciones ni hallazgos. No constituye un respaldo completo de PostgreSQL; la recuperación integral requiere un respaldo adicional de la base.

La importación de datos históricos y la semilla son operaciones opcionales, separadas de las migraciones. La importación de prospectos se omite cuando ya existen registros; no es una restauración incremental general. Revisa fuentes y base objetivo antes de ejecutarlas. La contingencia local de Jobs no sincroniza automáticamente de vuelta con Postgres los cambios realizados durante una caída.

## Despliegue

1. Prepara PostgreSQL y un alojamiento compatible con la aplicación.
2. Configura de forma privada los servicios requeridos, la firma de sesión y el planificador.
3. Aplica las migraciones versionadas sobre la base objetivo.
4. Compila y despliega. El comando de compilación genera el cliente, pero no ejecuta migraciones.
5. Crea credenciales iniciales si la base todavía no las tiene.
6. Comprueba acceso, permisos API, conectividad de módulos y ejecución efectiva de las tareas programadas.

## Diferencias y limitaciones detectadas

- Calendario: `lib/automation.ts` conserva el cálculo de búsquedas por días impares, mientras `vercel.json` programa lunes, miércoles y viernes. La próxima fecha mostrada puede diferir del cron real.
- Permisos: Jobs y las acciones heredadas de prospectos no tienen la misma validación de autenticación que las rutas principales. Proteger las páginas del dashboard no resuelve esa diferencia.
- Sesión e integración: investigación y rastreo requieren cookie de sesión; un token de integración por sí solo no habilita esas rutas.
- Analítica: el contador actual de contactados incluye cualquier estado distinto de generado y analizado, incluidos aprobados o rechazados; no representa envíos confirmados. Los contadores internos de reuniones y propuestas se inicializan, pero no se calculan.
- Aprobación: hay avance automático por puntuación y preparación de mensajes. Las notas de exportación que afirman aprobación humana universal no describen todos los flujos del código.
- Entrega: un cambio manual a contactado o la apertura del cliente de correo no confirma un envío. El resultado SMTP y sus eventos son evidencia independiente.
- Jobs: no hay motor de búsqueda ni envío de postulaciones integrado; el mantenimiento de vacantes y perfil depende de datos importados.
- Contrato: OpenAPI y documentos históricos pueden omitir funciones o conservar referencias antiguas. Los controladores, modelos, comandos y configuración versionada son las fuentes de implementación.
- Reportes y envío: una referencia de rastreo creada durante la búsqueda no garantiza un historial local con PDF; el envío puede quedar bloqueado hasta completar ese flujo.
- Presupuesto SMTP: los límites compartidos descritos corresponden al procesamiento por lotes. La ruta de envío individual comprueba estado, borrador, programación y ventana, pero no utiliza ese mismo presupuesto de lote.
- WhatsApp: el script local selecciona registros listos, sin contacto previo, sin correo y con teléfono; intenta entre 2 y 5 por ejecución. Registra éxito tras accionar el navegador, sin verificar recepción por el destinatario.
- Respaldo: la copia operativa omite entidades y archivos necesarios para restaurar toda la aplicación.
- Estado externo: la etiqueta visual de operación activa no es una comprobación de salud de Postgres, correo o proveedores.

Estas diferencias quedan documentadas; no se modifican los comportamientos del producto como parte de esta actualización del README.
