# TravelPlan

Webapp estática con Astro para organizar viajes compartidos con autenticación de Google en Firebase y Cloud Firestore.

Incluye:

- Landing traducida con acceso mediante Google.
- Dashboard de viajes.
- Vista de detalle para cada viaje.
- Vista de detalle para cada plan.
- Calendario mensual por viaje.
- Calendario global de todos los viajes.
- Vista de mapa por viaje con Leaflet.
- Localización de planes con búsqueda sobre OpenStreetMap.
- Wizard de sugerencias de planes con IA autenticada dentro de cada viaje.
- i18n con `es` y `en`.
- Diseño responsive con light mode y dark mode.
- Compatibilidad con dominio raíz, subrutas y GitHub Pages.
- Tests smoke con `node:test`.

## Requisitos

Usa Node 22.

```sh
nvm use
npm ci
```

## Comandos

| Comando | Acción |
| --- | --- |
| `npm run dev` | Arranca Astro en local |
| `npm run build` | Genera `dist/` |
| `npm run preview` | Previsualiza el build |
| `npm test` | Ejecuta tests smoke |
| `npm run clean` | Limpia `dist` y `.astro` |

## Variables de entorno

Para desarrollo local, configura `.env` a partir de `.env.example`:

```env
ASTRO_SITE=https://travelplan.alon.one
ASTRO_BASE=/
PUBLIC_REPOSITORY_URL=https://github.com/jorgealonso/travel-plan
PUBLIC_FIREBASE_API_KEY=...
PUBLIC_FIREBASE_AUTH_DOMAIN=...
PUBLIC_FIREBASE_PROJECT_ID=...
PUBLIC_FIREBASE_STORAGE_BUCKET=...
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
PUBLIC_FIREBASE_APP_ID=...
```

Para una preview en subruta:

```env
ASTRO_SITE=https://usuario.github.io
ASTRO_BASE=/travel-plan
```

Para GitHub Pages, crea estas `Repository variables` en GitHub:

- `ASTRO_SITE`
- `ASTRO_BASE`
- `PUBLIC_REPOSITORY_URL`
- `PUBLIC_FIREBASE_API_KEY`
- `PUBLIC_FIREBASE_AUTH_DOMAIN`
- `PUBLIC_FIREBASE_PROJECT_ID`
- `PUBLIC_FIREBASE_STORAGE_BUCKET`
- `PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `PUBLIC_FIREBASE_APP_ID`

Los workflows de CI y Pages ya leen esos valores desde `vars.*`.

## Arquitectura

Estructura principal:

```text
src/
├── components/
│   ├── app/
│   └── pages/
├── config/
├── i18n/
├── lib/
│   ├── app/
│   └── firebase/
├── pages/
│   ├── app/
│   └── [locale]/app/
├── scripts/pages/
└── styles/
```

### Rutas principales

- `/` y `/en/`: landing y acceso.
- `/app/` y `/en/app/`: dashboard.
- `/app/trip/?trip=ID`: detalle de viaje.
- `/app/plan/?trip=ID&plan=ID`: detalle de plan.
- `/app/calendar/?trip=ID`: calendario del viaje.
- `/app/map/?trip=ID`: mapa del viaje.
- `/app/trip-plan-suggestions/?trip=ID`: wizard IA para proponer planes del viaje.
- `/app/calendar/all/`: calendario global.

Se usan parámetros de búsqueda para mantener compatibilidad total con GitHub Pages, ya que el hosting es estático y no hay SSR.

## Firebase

Consulta [docs/firebase-guide.md](docs/firebase-guide.md) para:

- variables públicas,
- colecciones,
- reglas sugeridas de Firestore,
- índices esperados,
- despliegue en GitHub Pages con `travelplan.alon.one`.

## IA autenticada

Consulta [docs/ai-authenticated-client.md](docs/ai-authenticated-client.md) para el patrón obligatorio de integración con el cliente IA autenticado, validación JSON estricta y manejo de errores.

## Traducciones e idiomas

Las traducciones viven en:

```txt
src/i18n/translations/
```

Idiomas activos:

- `/` para español.
- `/en/` para inglés.

Mantén todas las claves alineadas entre JSON.

## Despliegue

La web está preparada para GitHub Pages con dominio personalizado.

- `public/CNAME` ya apunta a `travelplan.alon.one`.
- Define `ASTRO_SITE=https://travelplan.alon.one` como Repository Variable.
- Mantén `ASTRO_BASE=/` como Repository Variable en producción.
- Define también todas las `PUBLIC_FIREBASE_*` como Repository Variables.
- Ejecuta `npm test` y `npm run build` antes de publicar.

## Calidad

Antes de cerrar cambios:

```sh
npm test
npm run build
```
