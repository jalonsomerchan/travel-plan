# PWA y soporte sin conexión

La app incluye una capa PWA para que pueda instalarse y reutilizar datos ya cargados cuando no haya conexión.

## Qué cubre ahora

- Manifest web mejorado con `id`, `scope`, `start_url`, categorías y modo `standalone`.
- Metadatos móviles en `BaseLayout.astro`.
- Service worker registrado desde el layout base.
- Indicador accesible de conexión para avisar cuando la app está offline o vuelve a estar online.
- Caché de shell inicial para la home, dashboard, pantallas internas principales, manifest e iconos básicos.
- Fallback de navegación a la shell cacheada cuando no hay red, incluyendo rutas internas con parámetros como `?trip=...`.
- Caché de assets estáticos visitados, como imágenes y fuentes.
- Actualización network-first de scripts, estilos y manifest para evitar servir versiones antiguas cuando hay conexión.
- Persistencia offline de Firestore con caché local persistente y soporte multi-pestaña cuando el navegador lo soporta con suficiente estabilidad.
- Caché propia persistente en `localStorage` para viajes y planes ya visitados, usada como respaldo en Safari iOS.
- Escrituras no bloqueantes para crear y editar planes, apoyadas en la cola local de Firestore cuando el navegador está offline.

## Datos sin conexión

Firestore mantiene en el dispositivo los documentos que ya se han leído en sesiones anteriores. Esto permite abrir vistas con datos visitados previamente incluso si la red falla, siempre que Firebase haya podido guardarlos en la caché local del navegador.

La caché compartida propia de la app funciona como valor inicial de UI, se guarda en `localStorage` para sobrevivir a cierres de la PWA en iPhone y se limpia al cambiar usuario o cerrar sesión.

## Escrituras offline

Las pantallas de crear y editar planes usan helpers no bloqueantes (`queueCreatePlan(...)` y `queueUpdatePlan(...)`). La UI no espera a que el servidor confirme la escritura: Firestore la guarda localmente cuando puede y la sincroniza al recuperar conexión.

Convención:

- Usar helpers `queue*` solo en acciones donde sea aceptable confirmar la UI con escritura local pendiente.
- Mantener helpers `async` como `createPlan(...)` o `updatePlan(...)` cuando la pantalla necesite confirmación real del servidor antes de continuar.
- Registrar en consola los fallos tardíos de escrituras encoladas para depuración.
- Actualizar la caché compartida cuando exista un valor cacheado previo, para que la navegación inmediata vea el cambio.

### Compatibilidad Safari iOS

Safari iOS e iPadOS puede fallar de forma silenciosa con IndexedDB persistente y gestor multi-pestaña de Firestore, especialmente en listeners de listas como viajes o planes.

Por eso la app centraliza toda la inicialización de Firestore en `src/lib/firebase/config.ts`:

- Navegadores compatibles: usan `initializeFirestore(...)` con `persistentLocalCache(...)`.
- Safari iOS / iPadOS: usan un modo seguro con `getFirestore(app)` sin esa persistencia avanzada.

Como ese modo seguro no garantiza datos tras cerrar la PWA, la app mantiene una caché propia en `localStorage` para los viajes y planes visitados. Para que esa caché pueda verse sin red, el service worker precachea las rutas internas más usadas y, al navegar offline a una URL con query params, busca también la misma ruta sin parámetros.

Regla obligatoria para el proyecto:

- Ningún módulo de `src/lib/firebase/` debe inicializar Firestore por su cuenta.
- Todas las lecturas y escrituras deben usar siempre `getFirebaseDb()`.
- Las pantallas críticas deben pintar primero datos de la caché compartida cuando existan.

## Estado de conexión

`PwaConnectionStatus.astro` muestra un aviso discreto cuando el navegador pasa a modo offline. También muestra durante unos segundos que la conexión ha vuelto. El aviso usa `aria-live="polite"`, textos i18n y estilos compatibles con modo claro y oscuro.

## Estrategia del service worker

- En `install`, precachea la shell mínima y las rutas internas principales con rutas compatibles con `BASE_URL`.
- En navegación, usa estrategia network-first y vuelve a la caché si falla la red.
- En rutas con parámetros, como `/app/trip/?trip=...`, busca también la misma ruta sin query para poder servir la shell cacheada.
- En scripts, estilos y manifest, usa estrategia network-first para servir versiones nuevas cuando hay conexión y solo usar caché como respaldo offline.
- En imágenes y fuentes, usa cache-first y guarda respuestas válidas para siguientes visitas.
- Ignora peticiones externas y métodos distintos de `GET`.

## Límites actuales

- El service worker no intenta cachear llamadas externas ni APIs de Firebase.
- Todavía no hay una cola visual propia de cambios pendientes; las mutaciones encoladas dependen del soporte de Firestore.
- Las reglas de seguridad siguen aplicándose cuando Firestore sincroniza con el servidor.
- En iPhone, solo estarán disponibles sin conexión los viajes y planes que ya se hayan abierto con conexión al menos una vez.

## Siguientes fases recomendadas

1. Añadir cola visible de cambios pendientes si se quiere edición offline más explícita.
2. Revisar pantallas críticas para asegurar que muestran mensajes útiles cuando la caché no tiene datos previos.
3. Añadir caché propia para más colecciones críticas si se quiere cubrir checklist, equipaje, alojamiento avanzado o puntos de interés en iPhone.
