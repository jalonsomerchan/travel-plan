# Caché compartida de datos Firebase

La app usa una caché pequeña para reutilizar datos compartidos entre páginas cercanas del mismo viaje.

## Objetivo

Evitar estados vacíos y trabajo repetido al navegar entre vistas que usan los mismos datos, especialmente datos del viaje y planes del viaje, sin sustituir los listeners en tiempo real cuando una página necesita datos actualizados.

## Convención

- La caché vive en `src/lib/firebase/shared-data-cache.ts`.
- Usa `localStorage` cuando está disponible y una caché en memoria como respaldo.
- El uso de `localStorage` permite conservar viajes y planes ya visitados al cerrar y reabrir la PWA en Safari iOS / iPhone, donde la persistencia avanzada de Firestore se mantiene en modo seguro.
- Solo guarda datos normalizados que ya se usan en la UI.
- Se limpia al cambiar de usuario o cerrar sesión.
- Se invalida al crear, editar o borrar planes.
- Se invalida al crear, editar o aceptar invitaciones que cambian datos de viaje.
- Las suscripciones pueden emitir primero el valor cacheado y después actualizarlo con el snapshot de Firestore.
- Las páginas que solo necesitan contexto inicial pueden usar lecturas puntuales cacheadas en lugar de listeners permanentes.

## Límites

La caché no reemplaza permisos ni reglas de Firestore. Tampoco debe usarse para guardar datos especialmente sensibles. Si una página necesita tiempo real, debe mantener su listener con `createSubscriptionScope()` y usar la caché solo como valor inicial.

## Datos cubiertos ahora

- Datos de un viaje mediante `subscribeTrip(...)`.
- Lectura puntual de viaje mediante `getTripOnce(...)`.
- Datos de viajes listados mediante `subscribeUserTrips(...)`.
- Planes de un viaje mediante `subscribeTripPlans(...)`.
- Lectura puntual de planes de un viaje mediante `getTripPlansOnce(...)`.
- Plan individual mediante la lista de planes cacheada como valor inicial.
- Lectura puntual de plan mediante `getPlanOnce(...)`.

## Cuándo ampliar

Antes de añadir nuevos datos a la caché, revisa:

- Que el dato se repite entre varias páginas.
- Que existe una invalidación clara.
- Que no rompe cambios de usuario ni cierre de sesión.
- Que se mantiene el listener real cuando la pantalla necesita datos actualizados.