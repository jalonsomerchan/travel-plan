# PWA y soporte sin conexión

La app incluye una capa PWA para que pueda instalarse y reutilizar datos ya cargados cuando no haya conexión.

## Qué cubre ahora

- Manifest web mejorado con `id`, `scope`, `start_url`, categorías y modo `standalone`.
- Metadatos móviles en `BaseLayout.astro`.
- Service worker de limpieza para desregistrar versiones antiguas y borrar cachés heredadas.
- La limpieza legacy de cachés, service workers antiguos e IndexedDB se programa tras `load` y en idle para no competir con el primer render.
- Indicador accesible de conexión para avisar cuando la app está offline o vuelve a estar online.
- Sin caché de shell ni fallback de navegación offline: se prioriza servir la versión online real para evitar estados obsoletos.
- Sin persistencia offline avanzada de Firestore: `getFirebaseDb()` usa solo la inicialización central con fallback de transporte.
- Caché propia breve en `localStorage` para viajes y planes ya visitados, usada solo como respaldo inicial limitado.
- Lectura directa autenticada por REST en el dashboard cuando el SDK de Firestore responde con caché vacía o estado offline.
- Escrituras no bloqueantes para crear y editar planes, apoyadas en la cola local de Firestore cuando el navegador está offline.

## Datos sin conexión

La prioridad actual es cargar datos reales desde servidor cuando hay conexión. Por eso no se usa persistencia offline avanzada de Firestore ni caché de navegación de service worker.

La caché compartida propia de la app funciona como valor inicial breve de UI, se guarda en `localStorage` con caducidad corta y se limpia al cambiar usuario o cerrar sesión. Si el dashboard recibe una lista vacía desde el SDK pero el usuario está conectado, intenta una lectura directa autenticada por REST contra Firestore antes de dar por hecho que no hay viajes.

## Escrituras offline

Las pantallas de crear y editar planes usan helpers no bloqueantes (`queueCreatePlan(...)` y `queueUpdatePlan(...)`). La UI no espera a que el servidor confirme la escritura: Firestore la guarda localmente cuando puede y la sincroniza al recuperar conexión.

Ese mismo patrón también se aplica en los guardados desde IA donde el bloqueo resulta especialmente frustrante:

- `trip-ai-prompt` guarda los planes seleccionados con `queueCreatePlan(...)`.
- `trip-plan-suggestions` guarda cada sugerencia aceptada con `queueCreatePlan(...)`.
- `trip-pois-ai-prompt` guarda los puntos seleccionados con `queueCreateTripPointOfInterest(...)`.

Convención:

- Usar helpers `queue*` solo en acciones donde sea aceptable confirmar la UI con escritura local pendiente.
- Mantener helpers `async` como `createPlan(...)` o `updatePlan(...)` cuando la pantalla necesite confirmación real del servidor antes de continuar.
- Registrar en consola los fallos tardíos de escrituras encoladas para depuración.
- Actualizar la caché compartida cuando exista un valor cacheado previo, para que la navegación inmediata vea el cambio.

### Compatibilidad Safari iOS

Safari iOS e iPadOS puede fallar de forma silenciosa con IndexedDB persistente y gestor multi-pestaña de Firestore, especialmente en listeners de listas como viajes o planes.

Por eso la app centraliza toda la inicialización de Firestore en `src/lib/firebase/config.ts`:

- Todos los navegadores usan `initializeFirestore(...)` centralizado sin `persistentLocalCache(...)`.
- Se mantienen `experimentalAutoDetectLongPolling` y `useFetchStreams: false` para mejorar compatibilidad de transporte.

Como el objetivo principal es evitar estados offline falsos, el service worker ya no precachea rutas internas ni intercepta navegación. Su función actual es limpiar caches heredadas y desregistrarse.

Regla obligatoria para el proyecto:

- Ningún módulo de `src/lib/firebase/` debe inicializar Firestore por su cuenta.
- Todas las lecturas y escrituras deben usar siempre `getFirebaseDb()`.
- Las pantallas críticas deben pintar primero datos de la caché compartida cuando existan.

## Estado de conexión

`PwaConnectionStatus.astro` muestra un aviso discreto cuando el navegador pasa a modo offline. También muestra durante unos segundos que la conexión ha vuelto. El aviso usa `aria-live="polite"`, textos i18n y estilos compatibles con modo claro y oscuro.

## Estrategia del service worker

- En `install`, llama a `self.skipWaiting()` y limpia caches heredadas.
- En `activate`, borra caches, se desregistra y reclama clientes para dejar de interceptar tráfico.
- En `fetch`, no intercepta peticiones.
- La respuesta de `sw.js` usa `Cache-Control: no-store, max-age=0`.
- El registro y la limpieza desde cliente se ejecutan despues de `load` y en idle para reducir trabajo durante el arranque.

## Límites actuales

- El service worker no cachea llamadas externas, APIs de Firebase, HTML ni assets.
- Todavía no hay una cola visual propia de cambios pendientes; las mutaciones encoladas dependen del soporte interno de Firestore.
- Las reglas de seguridad siguen aplicándose cuando Firestore sincroniza con el servidor.
- Si no hay conexión real, el dashboard solo podrá mostrar datos ya disponibles en la caché breve de la app.

## Siguientes fases recomendadas

1. Añadir cola visible de cambios pendientes si se quiere edición offline más explícita.
2. Revisar pantallas críticas para asegurar que muestran mensajes útiles cuando la caché no tiene datos previos.
3. Añadir caché propia para más colecciones críticas si se quiere cubrir checklist, equipaje, alojamiento avanzado o puntos de interés en iPhone.
