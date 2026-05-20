# Firebase y despliegue

Esta webapp usa Firebase Authentication con proveedor de Google y Cloud Firestore desde cliente, manteniendo Astro como build estático compatible con GitHub Pages.

## Variables de entorno

En local puedes usar `.env`. Para GitHub Pages, configura estas claves como `Repository variables` del repositorio:

```env
ASTRO_SITE=https://travelplan.alon.one
ASTRO_BASE=/
PUBLIC_REPOSITORY_URL=https://github.com/jalonsomerchan/travel-plan
PUBLIC_FIREBASE_API_KEY=...
PUBLIC_FIREBASE_AUTH_DOMAIN=...
PUBLIC_FIREBASE_PROJECT_ID=...
PUBLIC_FIREBASE_STORAGE_BUCKET=...
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
PUBLIC_FIREBASE_APP_ID=...
```

Nombres exactos de las variables en GitHub:

- `ASTRO_SITE`
- `ASTRO_BASE`
- `PUBLIC_REPOSITORY_URL`
- `PUBLIC_FIREBASE_API_KEY`
- `PUBLIC_FIREBASE_AUTH_DOMAIN`
- `PUBLIC_FIREBASE_PROJECT_ID`
- `PUBLIC_FIREBASE_STORAGE_BUCKET`
- `PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `PUBLIC_FIREBASE_APP_ID`

## Authentication

En Firebase Authentication debes habilitar el proveedor `Google`.

La app no usa email/password ni otros proveedores en esta versión.

Para previews en subruta puedes usar:

```env
ASTRO_SITE=https://usuario.github.io
ASTRO_BASE=/travel-plan
```

## Sincronización de perfil

Al iniciar sesión, la app intenta sincronizar `users/{uid}` con el correo y nombre del usuario autenticado. Si esa escritura falla por reglas, permisos o conectividad, el acceso no se bloquea: Firebase Auth sigue siendo la fuente de verdad de la sesión y el error queda registrado con `console.warn` para depuración.

## Colecciones usadas

- `users/{uid}`: perfil básico del usuario autenticado. Solo puede leerlo o escribirlo el propio usuario.
- `trips/{tripId}`: viaje principal con fechas, estado, dueño y `memberIds`.
- `trips/{tripId}/members/{uid}`: permisos de cada usuario invitado.
- `trips/{tripId}/plans/{planId}`: planes del viaje.
- `trips/{tripId}/checklistItems/{itemId}`: checklist pequeña de preparación asociada al viaje.
- `trips/{tripId}/luggageItems/{itemId}`: lista privada de equipaje visible solo para la persona creadora del viaje.
- `tripInvites/{inviteId}`: invitaciones pendientes por correo.
- `tripInvites/{tripId_emailLower}`: invitaciones pendientes por correo. El cliente no consulta `users` para saber si ese correo tiene cuenta; al aceptar, se asigna el `userId` del usuario autenticado.
- `mail/{mailId}`: cola de emails compatible con Firebase Extensions Trigger Email. La app crea un documento aquí al enviar una invitación, pero el correo solo sale si la extensión `firebase/firestore-send-email` está instalada y configurada con SMTP.

## Envío real de correos de invitación

La app está desplegada como frontend estático, así que no puede enviar SMTP directamente. Para enviar emails reales usa la extensión oficial de Firebase `firebase/firestore-send-email`.

Configuración recomendada:

1. Instala la extensión Trigger Email desde Firebase console o con CLI:

```sh
firebase ext:install firebase/firestore-send-email --project=travelplan-b7ee9
```

2. Configura el proveedor SMTP en la extensión.
3. Usa `mail` como colección de documentos de email.
4. Despliega las reglas de Firestore:

```sh
firebase deploy --only firestore:rules
```

Al enviar una invitación, la app crea también un documento en `mail` con esta forma:

```json
{
  "to": "persona@example.com",
  "message": {
    "subject": "Invitación a Lisboa en TravelPlan",
    "text": "Texto plano del email",
    "html": "<p>HTML del email</p>"
  },
  "inviteId": "tripId_persona@example.com",
  "tripId": "tripId",
  "ownerId": "uid"
}
```

Las reglas solo permiten crear documentos `mail` a usuarios autenticados que sean propietarios del viaje indicado por `tripId`. No se permite leer, editar ni borrar emails desde el cliente.

## Estructura recomendada para checklist de viaje

La checklist de preparación debe mantenerse separada de los planes del itinerario.

Documento por ítem en `trips/{tripId}/checklistItems/{itemId}`:

```json
{
  "title": "Revisar pasaportes",
  "status": "pending"
}
```

Campos esperados:

- `title`: texto corto visible en la UI.
- `status`: `pending` o `completed`.
- `createdAt` y `updatedAt`: timestamps de servidor para trazabilidad.

Mantener esta estructura pequeña evita mezclar lógica de preparación con la de `plans`, que ya tiene fechas, ubicaciones y categorías propias.

## Estructura recomendada para equipaje privado

La lista de equipaje debe seguir la misma estructura que la checklist, pero en una colección separada y privada para la persona propietaria del viaje.

Documento por ítem en `trips/{tripId}/luggageItems/{itemId}`:

```json
{
  "title": "Pasaporte",
  "status": "pending"
}
```

Campos esperados:

- `title`: texto corto visible en la UI.
- `status`: `pending` o `completed`.
- `createdAt` y `updatedAt`: timestamps de servidor para trazabilidad.

Regla práctica:

- `luggageItems` no debe ser visible para miembros invitados.
- Solo `ownerId` del viaje puede leer o escribir esa subcolección.

## Flujo de invitaciones

1. La persona editora introduce un correo y un rol.
2. La app crea o reemplaza `tripInvites/{tripId_emailLower}` con `emailLower`, rol y metadatos del viaje, sin consultar `users` por correo.
3. La app crea un documento `mail` con el email de invitación.
4. La extensión Trigger Email envía el correo si está instalada y configurada.
5. El usuario invitado ve sus invitaciones pendientes filtrando por su propio email autenticado.
6. Al aceptar, la app crea `trips/{tripId}/members/{uid}`, añade el `uid` a `memberIds` y marca la invitación como aceptada.

Este diseño evita filtrar desde cliente si un correo tiene cuenta y evita el error `Missing or insufficient permissions` provocado por intentar leer perfiles ajenos en `users`.

## Índices sugeridos

La app consulta:

- `trips` por `memberIds` y `startDate`.
- `tripInvites` por `emailLower` y `status`.

Firestore suele pedir estos índices automáticamente desde la consola. Si aparece un error de índice, créalo con esos campos en ese orden.

## Flujo de despliegue

1. Configura GitHub Pages para publicar con GitHub Actions.
2. Añade el dominio personalizado `travelplan.alon.one`.
3. Mantén `public/CNAME` con ese dominio.
4. Define `ASTRO_SITE`, `ASTRO_BASE=/`, `PUBLIC_REPOSITORY_URL` y todas las `PUBLIC_FIREBASE_*` como `Repository variables`.
5. Ejecuta `npm test` y `npm run build` antes de publicar.
6. Si cambian reglas, ejecuta `firebase deploy --only firestore:rules`.
7. Si quieres emails reales, instala y configura `firebase/firestore-send-email` con la colección `mail`.

## Limitación importante

GitHub Pages es estático, así que las vistas de detalle usan páginas estáticas con parámetros de búsqueda:

- `.../app/trip/?trip=ID`
- `.../app/plan/?trip=ID&plan=ID`
- `.../app/calendar/?trip=ID`

Así se conserva compatibilidad con dominio raíz, subrutas y despliegue estático sin SSR.
