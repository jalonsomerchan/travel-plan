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

- los POIs se consultan solo cuando la persona activa una categoría;
- la búsqueda se limita al viewport visible del mapa;
- se limita el número de resultados con `mapPoiLimit`;
- existe botón de refresco manual para volver a consultar la zona visible;
- se muestran estados de carga, vacío y error.

Si en el futuro el tráfico crece, conviene mover los POIs a un backend propio, cachearlos o usar un proveedor con contrato y cuotas claras.
