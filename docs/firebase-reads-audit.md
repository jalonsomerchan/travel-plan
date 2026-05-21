# Auditoría de lecturas Firebase

Esta auditoría resume la convención actual para elegir entre listeners en tiempo real y lecturas puntuales cacheadas.

## Criterio general

Usa lecturas puntuales cacheadas cuando la página solo necesita una foto inicial de los datos para rellenar un formulario, preparar un prompt o lanzar una acción puntual.

Usa listeners en tiempo real cuando la página debe reflejar cambios hechos por otra persona, otra pestaña o una mutación externa mientras el usuario permanece en la vista.

## Lecturas puntuales cacheadas

Estas páginas usan datos iniciales desde `getTripOnce(...)`, `getPlanOnce(...)` o `getTripPlansOnce(...)` y no deberían mantener listeners permanentes:

- `plan-create.ts`: solo necesita contexto inicial del viaje antes de crear un plan.
- `plan-edit.ts`: solo necesita cargar viaje y plan para rellenar el formulario.
- `trip-edit.ts`: solo necesita cargar datos iniciales del viaje para editarlo.
- `trip-accommodation.ts`: solo necesita cargar datos iniciales de viaje y alojamiento para editar y mostrar la ficha.
- `trip-plan-suggestions.ts`: solo necesita una foto inicial de viaje y planes existentes para generar sugerencias IA.
- `trip-ai-prompt.ts`: solo necesita una foto inicial de viaje y planes existentes para generar el prompt.

## Listeners en tiempo real

Estas vistas pueden mantener listeners porque su valor depende de cambios en vivo o de datos compartidos que pueden modificarse desde otra sesión:

- `dashboard.ts`: lista de viajes del usuario e invitaciones pendientes.
- `trip-invites.ts`: invitaciones pendientes del usuario.
- Vistas de detalle de viaje y plan: deben reflejar cambios de planes, puntos de interés, alojamiento o metadatos mientras el usuario consulta la vista.
- Vistas de mapa: deben reflejar cambios de planes, alojamiento, puntos de interés y configuración visual compartida.
- `global-calendar.ts`: agrega planes de varios viajes y debe actualizarse si cambian planes o viajes.
- Páginas colaborativas como checklist, equipaje, miembros, puntos de interés o notas, cuando existan listeners de colecciones editables.

## Convenciones vigentes

- Los listeners de página deben registrarse con `createSubscriptionScope()` y limpiarse al cambiar sesión y en `pagehide` cuando proceda.
- Las lecturas puntuales deben preferir helpers cacheados, por ejemplo `getTripOnce(...)`, `getPlanOnce(...)` o `getTripPlansOnce(...)`.
- Firestore sigue siendo la fuente de verdad; la caché es solo un valor inicial para reducir estados vacíos y lecturas repetidas.
- Las mutaciones que cambien viaje o planes deben invalidar la caché afectada.
- Al cambiar usuario o cerrar sesión se debe limpiar la caché compartida.

## Antes de añadir una nueva página

1. Decide si necesita tiempo real o solo datos iniciales.
2. Si solo necesita datos iniciales, usa lecturas puntuales cacheadas.
3. Si necesita tiempo real, usa `createSubscriptionScope()` para todos los listeners.
4. Añade un smoke test que proteja la convención elegida.
5. Actualiza esta auditoría si se añade un nuevo patrón de lectura.
