# Indice de archivos del proyecto

Este documento resume para que sirve cada zona del repositorio. Debe actualizarse cuando se anadan, eliminen o muevan archivos para que cualquier persona o agente pueda orientarse sin depender de contexto externo.

## Raiz del repositorio

- `agents.md`: reglas obligatorias para agentes IA, cambios en el proyecto, GitHub, i18n, rutas, tests y documentacion.
- `README.md`: descripcion general del proyecto y guia rapida de uso.
- `package.json`: metadatos del paquete, dependencias y scripts de desarrollo, build, test, formato y limpieza.
- `package-lock.json`: bloqueo exacto de dependencias instaladas con npm.
- `astro.config.mjs`: configuracion de Astro, integraciones, i18n, `site` y `base`.
- `tsconfig.json`: configuracion TypeScript heredada de Astro.
- `firebase.json`: configuracion de Firebase Hosting, Firestore y emuladores cuando aplique.
- `.env.example`: plantilla documentada de variables de entorno, sin secretos reales.
- `.gitignore`: exclusiones de Git para dependencias, builds, artefactos locales y variables sensibles.
- `.nvmrc`: version recomendada de Node.
- `.prettierrc`: reglas de formato de Prettier.
- `.prettierignore`: archivos excluidos del formateo automatico.

## Configuracion de editor, CI y automatizacion

- `.vscode/extensions.json`: extensiones recomendadas para trabajar en el proyecto.
- `.vscode/launch.json`: configuracion local de depuracion.
- `.github/dependabot.yml`: actualizaciones automaticas de dependencias.
- `.github/workflows/ci.yml`: comprobaciones de CI para pull requests.
- `.github/workflows/pages.yml`: despliegue en GitHub Pages cuando corresponde.

## Documentacion

- `docs/project-index.md`: este indice de archivos y responsabilidades.
- `docs/design-system.md`: tokens, patrones visuales y reglas de diseno.
- `docs/template-usage.md`: guia de uso de la plantilla Astro.
- `docs/i18n-guide.md`: convenciones de idiomas, traducciones y rutas localizadas.
- `docs/github-pages.md`: despliegue compatible con GitHub Pages y subrutas.
- `docs/testing-guide.md`: criterios y comandos para tests smoke.
- `docs/firebase-guide.md`: configuracion y uso de Firebase.
- `docs/firebase-reads-audit.md`: auditoria de lecturas de Firebase.
- `docs/firebase-shared-cache.md`: cache compartida para datos Firebase.
- `docs/ai-authenticated-client.md`: cliente autenticado para funcionalidades de IA.
- `docs/ai-checklist.md`: checklist para cambios relacionados con IA.
- `docs/map-providers.md`: proveedores y criterios para mapas.
- `docs/pwa-offline.md`: comportamiento offline y PWA.
- `docs/destination-links.md`: convencion de datos y UI para enlaces utiles generales del destino.

## Archivos publicos

- `public/CNAME`: dominio personalizado usado por GitHub Pages.
- `public/favicon.svg`: favicon vectorial principal.
- `public/favicon.ico`: favicon clasico para compatibilidad.
- `public/favicon-96x96.png`: favicon PNG.
- `public/apple-touch-icon.png`: icono para iOS.
- `public/web-app-manifest-192x192.png`: icono PWA de 192 px.
- `public/web-app-manifest-512x512.png`: icono PWA de 512 px.
- `public/og-image.svg`: imagen Open Graph por defecto.
- `public/site.webmanifest`: manifest estatico complementario.

## Firebase

- `firebase/firestore.rules`: reglas de seguridad de Firestore.
- `firebase/firestore.indexes.json`: indices compuestos de Firestore.

## Scripts de mantenimiento

- `scripts/clean.mjs`: borra artefactos generados para dejar el repo en estado limpio.

## Configuracion de aplicacion

- `src/config/site.ts`: fuente central de nombre, URL, `base`, repositorio, version e idiomas.
- `src/config/map-layers.ts`: capas disponibles para mapas.
- `src/config/poi.ts`: configuracion general de puntos de interes.
- `src/config/trip-pois.ts`: categorias y reglas de puntos de interes asociados a viajes.

## Datos estaticos

- `src/data/public-pages.ts`: contenido estructurado de paginas publicas.
- `src/data/public-page-routing.ts`: rutas y slugs de paginas publicas.
- `src/data/public-page-ui.ts`: metadatos de UI para paginas publicas.

## Internacionalizacion

- `src/i18n/ui.ts`: helpers `useTranslations`, rutas localizadas y utilidades i18n.
- `src/i18n/translations/es.json`: traducciones globales en castellano.
- `src/i18n/translations/en.json`: traducciones globales en ingles.
- `src/i18n/feature-translations/*/es.json`: traducciones en castellano separadas por funcionalidad.
- `src/i18n/feature-translations/*/en.json`: traducciones en ingles separadas por funcionalidad.
- `src/i18n/feature-translations/destination-links.es.json`: traducciones en castellano para enlaces utiles del destino.
- `src/i18n/feature-translations/destination-links.en.json`: traducciones en ingles para enlaces utiles del destino.

## Layouts, estilos y utilidades base

- `src/layouts/BaseLayout.astro`: estructura HTML base, SEO, Open Graph, tema, header y footer.
- `src/styles/global.css`: tokens globales, resets, utilidades y estilos compartidos.
- `src/styles/pwa-status.css`: estilos especificos del estado de conexion PWA.
- `src/utils/paths.ts`: helpers para construir rutas y assets compatibles con `base`.

## Componentes compartidos

- `src/components/Button.astro`: boton reutilizable con variantes visuales.
- `src/components/Container.astro`: contenedor responsive comun.
- `src/components/Header.astro`: cabecera publica y navegacion principal.
- `src/components/Footer.astro`: pie global con enlaces y version.
- `src/components/ThemeToggle.astro`: control de light mode y dark mode.
- `src/components/PwaConnectionStatus.astro`: indicador de conexion y estado offline.

## Componentes de aplicacion

- `src/components/app/AppShell.astro`: envoltorio principal de la zona autenticada.
- `src/components/app/AppToolbar.astro`: barra de acciones de vistas internas.
- `src/components/app/AppActionsMenu.astro`: menu de acciones genericas.
- `src/components/app/AppBackButton.astro`: boton de vuelta compatible con rutas localizadas.
- `src/components/app/AppSectionNav.astro`: navegacion entre secciones de app.
- `src/components/app/DashboardSectionNav.astro`: navegacion del dashboard.
- `src/components/app/TripSectionNav.astro`: navegacion dentro de un viaje.
- `src/components/app/TripNavigationTopbar.astro`: barra superior contextual de viaje.
- `src/components/app/TripContextHeader.astro`: cabecera con contexto del viaje activo.
- `src/components/app/Breadcrumbs.astro`: migas de pan accesibles.
- `src/components/app/LoadingState.astro`: estado de carga reutilizable.
- `src/components/app/GoogleSignInButton.astro`: boton de acceso con Google.
- `src/components/app/TripActionsMenu.astro`: acciones especificas de viaje.
- `src/components/app/TripFormFields.astro`: campos del formulario de viaje.
- `src/components/app/PlanFormFields.astro`: campos del formulario de plan.
- `src/components/app/PlanLocationFields.astro`: campos de ubicacion del plan.
- `src/components/app/LocationPickerFields.astro`: selector reutilizable de localizacion.
- `src/components/app/PlanLinksFields.astro`: campos para enlaces asociados a planes.
- `src/components/app/AccommodationFormFields.astro`: campos de alojamiento.
- `src/components/app/ChecklistItemFormFields.astro`: campos de items de checklist.
- `src/components/app/NearbyPoiExplorer.astro`: explorador de POIs cercanos.
- `src/components/app/TripPoiFormDialog.astro`: dialogo para crear o editar POIs.
- `src/components/app/TripAiPromptBody.astro`: contenido del prompt de IA de viajes.
- `src/components/app/TripAiPromptWizard.astro`: asistente guiado para prompts de viaje.
- `src/components/app/TripAiPromptWizardResult.astro`: resultado del asistente de prompts.
- `src/components/app/TripPoisAiPromptBody.astro`: contenido del prompt de IA para POIs.
- `src/components/app/TripPoisAiPromptWizard.astro`: asistente de prompts para POIs.

## Componentes de pagina

- `src/components/pages/LandingPage.astro`: home publica del producto.
- `src/components/pages/PublicInfoPage.astro`: paginas publicas informativas por slug.
- `src/components/pages/DashboardPage.astro`: dashboard autenticado.
- `src/components/pages/GlobalTodayPage.astro`: vista global de planes de hoy.
- `src/components/pages/GlobalCalendarPage.astro`: calendario global.
- `src/components/pages/GlobalChecklistsPage.astro`: checklists globales.
- `src/components/pages/TripCreatePage.astro`: creacion de viajes.
- `src/components/pages/TripEditPage.astro`: edicion de viajes.
- `src/components/pages/TripPage.astro`: detalle principal de un viaje.
- `src/components/pages/TripMembersPage.astro`: gestion de miembros de viaje.
- `src/components/pages/TripInvitesPage.astro`: invitaciones a viajes.
- `src/components/pages/TripAccommodationPage.astro`: alojamiento del viaje.
- `src/components/pages/TripCalendarPage.astro`: calendario del viaje.
- `src/components/pages/TripChecklistPage.astro`: checklist de viaje.
- `src/components/pages/TripLuggagePage.astro`: equipaje de viaje.
- `src/components/pages/TripMapPage.astro`: mapa del viaje.
- `src/components/pages/TripWeatherPage.astro`: meteorologia del viaje.
- `src/components/pages/TripPlanSuggestionsPage.astro`: sugerencias de planes.
- `src/components/pages/TripPoisPage.astro`: puntos de interes del viaje.
- `src/components/pages/TripPoisAiPromptPage.astro`: prompt IA para POIs.
- `src/components/pages/TripAiPromptPage.astro`: prompt IA para itinerarios.
- `src/components/pages/PlanCreatePage.astro`: creacion de planes.
- `src/components/pages/PlanEditPage.astro`: edicion de planes.
- `src/components/pages/PlanPage.astro`: detalle de plan.

## Rutas Astro

- `src/pages/index.astro`: home del idioma por defecto.
- `src/pages/[locale]/index.astro`: home de idiomas secundarios.
- `src/pages/404.astro`: pagina de error 404.
- `src/pages/[slug]/index.astro`: paginas publicas en el idioma por defecto.
- `src/pages/[locale]/[slug]/index.astro`: paginas publicas localizadas.
- `src/pages/manifest.webmanifest.ts`: manifest dinamico compatible con `base`.
- `src/pages/robots.txt.ts`: robots dinamico segun configuracion del sitio.
- `src/pages/sw.js.ts`: service worker generado desde Astro.
- `src/pages/app/**/index.astro`: rutas de app para el idioma por defecto.
- `src/pages/[locale]/app/**/index.astro`: rutas de app localizadas para idiomas secundarios.

## Logica de aplicacion

- `src/lib/app/models.ts`: tipos y modelos compartidos de la app.
- `src/lib/app/routes.ts`: helpers de rutas internas de aplicacion.
- `src/lib/app/dom.ts`: utilidades DOM de cliente.
- `src/lib/app/format.ts`: helpers de formato visible.
- `src/lib/app/coordinates.ts`: calculos de coordenadas y distancia.
- `src/lib/app/location-links.ts`: enlaces externos de ubicacion.
- `src/lib/app/weather.ts`: obtencion y normalizacion de meteorologia.
- `src/lib/app/weather-cache.ts`: cache de resultados meteorologicos.
- `src/lib/app/global-today.ts`: logica para la vista global de hoy.
- `src/lib/app/accommodation.ts`: modelo y helpers de alojamiento.
- `src/lib/app/invite-share.ts`: helpers para compartir invitaciones.
- `src/lib/app/destination-links.ts`: validacion, normalizacion y ordenacion de enlaces utiles del destino.
- `src/lib/app/plan-category-colors.ts`: colores por categoria de plan.
- `src/lib/app/plan-dates.ts`: reglas de fechas de planes.
- `src/lib/app/plan-flags.ts`: estados y banderas de planes.
- `src/lib/app/plan-links.ts`: validacion y normalizacion de enlaces de plan.
- `src/lib/app/plan-location.ts`: ubicacion de planes.
- `src/lib/app/plan-ai-tour-prompt.ts`: generacion de prompts de rutas/tours.
- `src/lib/app/ai-guide-text.ts`: textos derivados para guias IA.
- `src/lib/app/trip-date-range.ts`: calculos de rango de fechas de viaje.
- `src/lib/app/trip-location.ts`: ubicacion de viajes.
- `src/lib/app/trip-ai-prompt.ts`: logica de prompts IA de viaje.
- `src/lib/app/trip-ai-prompt-builder.ts`: constructor de prompt IA de viaje.
- `src/lib/app/trip-ai-prompt-wizard.ts`: estado y pasos del asistente de prompts.
- `src/lib/app/trip-plan-suggestions.ts`: reglas de sugerencias de planes.
- `src/lib/app/trip-pois.ts`: modelo y helpers de POIs de viaje.
- `src/lib/app/trip-poi-icons.ts`: iconos asociados a POIs.
- `src/lib/app/trip-pois-ai-prompt.ts`: logica de prompt IA para POIs.
- `src/lib/app/trip-pois-ai-prompt-builder.ts`: constructor de prompt IA para POIs.
- `src/lib/app/trip-pois-ai-prompt-wizard.ts`: estado y pasos del asistente de POIs.
- `src/lib/app/poi.ts`: helpers generales de puntos de interes.

## Firebase y persistencia

- `src/lib/firebase/config.ts`: inicializacion y configuracion del SDK Firebase.
- `src/lib/firebase/session.ts`: sesion de usuario y autenticacion.
- `src/lib/firebase/subscription-scope.ts`: control de suscripciones activas.
- `src/lib/firebase/snapshot-freshness.ts`: frescura y origen de snapshots.
- `src/lib/firebase/shared-data-cache.ts`: cache compartida de datos leidos.
- `src/lib/firebase/trip-rest.ts`: operaciones REST auxiliares de viajes.
- `src/lib/firebase/trip-reads.ts`: lecturas de viajes.
- `src/lib/firebase/trips.ts`: escrituras y operaciones principales de viajes.
- `src/lib/firebase/destination-links.ts`: persistencia de enlaces utiles del destino dentro del documento de viaje.
- `src/lib/firebase/plan-reads.ts`: lecturas de planes.
- `src/lib/firebase/plans.ts`: escrituras y operaciones principales de planes.
- `src/lib/firebase/checklists.ts`: persistencia de checklists.
- `src/lib/firebase/luggage.ts`: persistencia de equipaje.
- `src/lib/firebase/trip-pois.ts`: persistencia de POIs de viaje.

## IA

- `src/lib/ai/config.ts`: configuracion de proveedores y endpoints de IA.
- `src/lib/ai/index.ts`: punto de entrada de utilidades IA.
- `src/lib/ai/client.ts`: cliente base de IA.
- `src/lib/ai/authenticated-api-client.ts`: cliente autenticado para llamadas IA.
- `src/lib/ai/errors.ts`: errores normalizados de IA.
- `src/lib/ai/json.ts`: parseo y validacion de respuestas JSON.
- `src/lib/ai/limits.ts`: limites de uso y tamano.
- `src/lib/ai/flags.ts`: banderas de activacion de IA.
- `src/lib/ai/remote-config.ts`: configuracion remota de funcionalidades IA.
- `src/lib/ai/ui-state.ts`: estados de UI para flujos IA.
- `src/lib/ai/planning-assistant.ts`: asistente de planificacion.
- `src/lib/ai/dish-recommender.ts`: recomendaciones gastronomicas.
- `src/lib/ai/shopping-list.ts`: generacion de listas de compra.
- `src/lib/ai/pending-meal-recommendations.ts`: recomendaciones pendientes de comidas.
- `src/lib/ai/trip-plan-suggestions.ts`: sugerencias IA de planes para viajes.

## Scripts de cliente por pagina

- `src/scripts/pages/*.ts`: comportamiento de cliente dividido por vista para dashboard, viajes, planes, mapas, checklists, calendario, IA, POIs, equipaje, alojamiento, enlaces utiles del destino e invitaciones.
- `src/scripts/maps/*.ts`: integracion de Leaflet, Google Maps, capas, marcadores, visibilidad, geolocalizacion, POIs y controles moviles.
- `src/scripts/pwa/register-service-worker.ts`: registro del service worker.
- `src/scripts/pwa/connection-status.ts`: deteccion y publicacion del estado de conexion.

## Tests

- `tests/smoke.test.mjs`: comprobaciones basicas del proyecto.
- `tests/public-pages.test.mjs`: paginas publicas, slugs y rutas.
- `tests/asset-cache-busting.test.mjs`: cache busting de assets.
- `tests/pwa-offline.test.mjs`: soporte PWA y offline.
- `tests/firebase-*.test.mjs`: compatibilidad, auditoria, cache y cobertura de suscripciones Firebase.
- `tests/*subscription-scope*.test.mjs`: aislamiento de suscripciones por pagina o funcionalidad.
- `tests/map-*.test.mjs`: mapa, capas, ubicacion, POIs y visibilidad.
- `tests/plan-*.test.mjs`: fechas, estados, enlaces, ubicacion, colores y prompts de planes.
- `tests/trip-*.test.mjs`: viajes, formularios, calendario, checklists, equipaje, POIs, IA, clima, miembros, invitaciones y borrado.
- `tests/global-*.test.mjs`: vistas globales de hoy y checklists.
- `tests/dashboard-*.test.mjs`: dashboard, invitaciones y mini viajes.
- `tests/invite-flow.test.mjs`: flujo de invitaciones.
- `tests/list-view-mode.test.mjs`: modo de vista de listas.
- `tests/mobile-filter-and-list-actions.test.mjs`: filtros y acciones moviles.
- `tests/coordinates-distance.test.mjs`: calculo de distancias.
- `tests/ios-input-zoom.test.mjs`: prevencion de zoom automatico en iOS.
- `tests/offline-plan-writes.test.mjs`: escrituras offline de planes.
- `tests/poi-smoke.test.mjs`: comprobaciones basicas de POIs.
- `tests/destination-links.test.mjs`: comprobaciones de modelo, persistencia, i18n y UI de enlaces utiles del destino.

## Archivos generados o locales

Estos archivos pueden aparecer durante el desarrollo y normalmente no se editan a mano:

- `.astro/*`: tipos y configuracion generados por Astro.
- `.env`: variables locales reales; no debe commitearse ni copiarse en documentacion con secretos.
- `.DS_Store`: metadatos locales de macOS.
- `dist/`: salida de build.
- `node_modules/`: dependencias instaladas.
