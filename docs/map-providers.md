# Proveedores de mapas y puntos de interés

La configuración central de capas vive en `src/config/map-layers.ts`. Los controles reutilizables de Leaflet están en `src/scripts/maps/` y se usan tanto en el mapa del viaje como en el mapa del plan.

## Capas base

Las capas disponibles se definen con:

- `id`: identificador estable para persistir la selección local.
- `labelKey`: clave i18n que debe existir para todos los idiomas configurados.
- `urlTemplate`: plantilla pública de tiles compatible con Leaflet.
- `attribution`: atribución visible exigida por el proveedor.
- `theme`: compatibilidad visual aproximada con `light`, `dark` o `mixed`.

No se deben añadir capas que requieran tokens privados en el cliente. Si una capa necesita clave privada, debe implementarse mediante backend/proxy seguro o dejarse documentada como no disponible para frontend estático.

## Proveedores actuales

- OpenStreetMap estándar: capa por defecto, sin token privado. Se usa el host oficial sin subdominios para respetar su política actual de tiles.
- CARTO light/dark: capas públicas claras y oscuras basadas en OpenStreetMap. Mantienen atribución a OpenStreetMap y CARTO.
- Esri World Imagery: capa satélite pública sin token privado en esta integración. Mantiene la atribución de Esri y fuentes indicadas en la propia configuración.

## Ubicación actual

El botón de ubicación usa `navigator.geolocation.getCurrentPosition()` solo después de una interacción explícita del usuario. Debe manejar navegador no compatible, permiso denegado, timeout y coordenadas inválidas. El marcador de usuario usa un icono propio para diferenciarse de planes, alojamiento y POIs.

## Puntos de interés

La primera implementación usa Overpass API como fuente pública sin secretos privados en cliente. Para no saturar el mapa ni abusar del servicio:

- las búsquedas cercanas del viaje y del plan usan `POST https://overpass-api.de/api/interpreter`;
- las consultas se limitan por coordenadas, radio y categorías OSM conocidas;
- el radio se acota en frontend y el número máximo de resultados también;
- existe cache temporal en memoria por combinación de coordenadas, radio y categorías;
- se muestran estados de carga, vacío, timeout, rate limit y demasiados resultados;
- no se guardan resultados masivos en Firestore.

Si en el futuro el tráfico crece, conviene mover los POIs a un backend propio, cachearlos o usar un proveedor con contrato y cuotas claras.
