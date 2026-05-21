# Caché compartida de datos Firebase

La app usa una caché pequeña de sesión para reutilizar datos compartidos entre páginas cercanas del mismo viaje.

## Objetivo

Evitar estados vacíos y trabajo repetido al navegar entre vistas que usan los mismos datos, especialmente planes del viaje, sin sustituir los listeners en tiempo real cuando una página necesita datos actualizados.

## Convención

- La caché vive en `src/lib/firebase/shared-data-cache.ts`.
- Usa `sessionStorage` cuando está disponible y una caché en memoria como respaldo.
- Solo guarda datos normalizados que ya se usan en la UI.
- Se limpia al cambiar de usuario o cerrar sesión.
- Se invalida al crear, editar o borrar planes.
- Las suscripciones pueden emitir primero el valor cacheado y después actualizarlo con el snapshot de Firestore.

## Límites

La caché no reemplaza permisos ni reglas de Firestore. Tampoco debe usarse para guardar datos sensibles de forma persistente. Si una página necesita tiempo real, debe mantener su listener con `createSubscriptionScope()` y usar la caché solo como valor inicial.

## Datos cubiertos ahora

- Planes de un viaje mediante `subscribeTripPlans(...)`.
- Plan individual mediante la lista de planes cacheada como valor inicial.

## Cuándo ampliar

Antes de añadir nuevos datos a la caché, revisa:

- Que el dato se repite entre varias páginas.
- Que existe una invalidación clara.
- Que no rompe cambios de usuario ni cierre de sesión.
- Que se mantiene el listener real cuando la pantalla necesita datos actualizados.
