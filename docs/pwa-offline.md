# PWA y soporte sin conexión

La app incluye una capa PWA para que pueda instalarse y reutilizar datos ya cargados cuando no haya conexión.

## Qué cubre ahora

- Manifest web mejorado con `id`, `scope`, `start_url`, categorías y modo `standalone`.
- Metadatos móviles en `BaseLayout.astro`.
- Service worker registrado desde el layout base.
- Indicador accesible de conexión para avisar cuando la app está offline o vuelve a estar online.
- Caché de shell inicial para la home, manifest e iconos básicos.
- Fallback de navegación a la shell cacheada cuando no hay red.
- Caché de assets estáticos visitados, como imágenes y fuentes.
- Actualización network-first de scripts, estilos y manifest para evitar servir versiones antiguas cuando hay conexión.
- Persistencia offline de Firestore con caché local persistente y soporte multi-pestaña cuando el navegador lo soporta con suficiente estabilidad.

## Datos sin conexión

Firestore mantiene en el dispositivo los documentos que ya se han leído en sesiones anteriores. Esto permite abrir vistas con datos visitados previamente incluso si la red falla, siempre que Firebase haya podido guardarlos en la caché local del navegador.

La caché compartida propia de la app sigue funcionando como valor inicial de UI y se limpia al cambiar usuario o cerrar sesión.

### Compatibilidad Safari iOS

Safari iOS e iPadOS puede fallar de forma silenciosa con IndexedDB persistente y gestor multi-pestaña de Firestore, especialmente en listeners de listas como viajes o planes.

Por eso la app centraliza toda la inicialización de Firestore en `src/lib/firebase/config.ts`:

- Navegadores compatibles: usan `initializeFirestore(...)` con `persistentLocalCache(...)`.
- Safari iOS / iPadOS: usan un modo seguro con `getFirestore(app)` sin esa persistencia avanzada.

Regla obligatoria para el proyecto:

- Ningún módulo de `src/lib/firebase/` debe inicializar Firestore por su cuenta.
- Todas las lecturas y escrituras deben usar siempre `getFirebaseDb()`.

## Estado de conexión

`PwaConnectionStatus.astro` muestra un aviso discreto cuando el navegador pasa a modo offline. También muestra durante unos segundos que la conexión ha vuelto. El aviso usa `aria-live="polite"`, textos i18n y estilos compatibles con modo claro y oscuro.

## Estrategia del service worker

- En `install`, precachea la shell mínima con rutas compatibles con `BASE_URL`.
- En navegación, usa estrategia network-first y vuelve a la caché si falla la red.
- En scripts, estilos y manifest, usa estrategia network-first para servir versiones nuevas cuando hay conexión y solo usar caché como respaldo offline.
- En imágenes y fuentes, usa cache-first y guarda respuestas válidas para siguientes visitas.
- Ignora peticiones externas y métodos distintos de `GET`.

## Límites actuales

- El service worker no intenta cachear llamadas externas ni APIs de Firebase.
- La sincronización offline de cambios pendientes queda para una fase posterior.
- Las mutaciones offline dependen del soporte de Firestore; no hay aún una cola visual propia en la UI.

## Siguientes fases recomendadas

1. Añadir cola visible de cambios pendientes si se quiere edición offline más explícita.
2. Revisar pantallas críticas para asegurar que muestran mensajes útiles cuando la caché no tiene datos previos.
