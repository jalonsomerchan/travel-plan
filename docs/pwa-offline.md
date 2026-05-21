# PWA y soporte sin conexión

La app incluye una primera capa PWA para que pueda instalarse y reutilizar datos ya cargados cuando no haya conexión.

## Qué cubre esta fase

- Manifest web mejorado con `id`, `scope`, `start_url`, categorías y modo `standalone`.
- Metadatos móviles en `BaseLayout.astro`.
- Service worker mínimo registrado desde el layout base.
- Persistencia offline de Firestore con caché local persistente y soporte multi-pestaña.

## Datos sin conexión

Firestore mantiene en el dispositivo los documentos que ya se han leído en sesiones anteriores. Esto permite abrir vistas con datos visitados previamente incluso si la red falla, siempre que Firebase haya podido guardarlos en la caché local del navegador.

La caché compartida propia de la app sigue funcionando como valor inicial de UI y se limpia al cambiar usuario o cerrar sesión.

## Límites actuales

- El service worker de esta fase no cachea todavía todas las rutas HTML ni assets generados.
- La sincronización offline de cambios pendientes queda para una fase posterior.
- Las mutaciones offline dependen del soporte de Firestore; no hay aún una cola visual propia en la UI.

## Siguientes fases recomendadas

1. Añadir caché de shell estático y fallback offline para navegación.
2. Mostrar estado de conexión en la app.
3. Añadir cola visible de cambios pendientes si se quiere edición offline más explícita.
4. Revisar pantallas críticas para asegurar que muestran mensajes útiles cuando la caché no tiene datos previos.
