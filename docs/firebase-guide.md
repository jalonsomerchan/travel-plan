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

## Inicialización de Firestore en navegador

Toda la app debe obtener Firestore desde `src/lib/firebase/config.ts` mediante `getFirebaseDb()`.

Motivo:

- El proyecto usa caché local persistente cuando el navegador la soporta bien.
- Safari iOS / iPadOS puede dar problemas silenciosos con la persistencia avanzada de Firestore.
- Para esos navegadores la app cae automáticamente a un modo seguro sin esa persistencia, reutilizando la misma API `getFirebaseDb()`.

Reglas prácticas:

- No usar `initializeFirestore(...)` fuera de `src/lib/firebase/config.ts`.
- No usar `getFirestore(app)` directamente fuera de `src/lib/firebase/config.ts`.
- Todos los módulos en `src/lib/firebase/` deben recibir la instancia llamando a `getFirebaseDb()`.

## Colecciones usadas

- `users/{uid}`: perfil básico del usuario autenticado. Solo puede leerlo o escribirlo el propio usuario.
- `trips/{tripId}`: viaje principal con fechas, estado, dueño y `memberIds`.
- `trips/{tripId}/members/{uid}`: permisos de cada usuario invitado.
- `trips/{tripId}/plans/{planId}`: planes del viaje.
- `trips/{tripId}/pointsOfInterest/{pointId}`: puntos de interés guardados del viaje.
- `trips/{tripId}/checklistItems/{itemId}`: checklist pequeña de preparación asociada al viaje.
- `trips/{tripId}/luggageItems/{itemId}`: lista privada de equipaje por persona dentro del viaje.
- `tripInvites/{inviteId}`: invitaciones pendientes por correo.
- `tripInvites/{tripId_emailLower}`: invitaciones pendientes por correo. El cliente no consulta `users` para saber si ese correo tiene cuenta; al aceptar, se asigna el `userId` del usuario autenticado.

## Estructura recomendada para planes

Los documentos de `trips/{tripId}/plans/{planId}` pueden incluir enlaces asociados en el campo `links`.

```json
{
  "name": "Museo local",
  "description": "Visita principal de la mañana",
  "category": "museum",
  "status": "pending",
  "links": [
    {
      "label": "Entradas",
      "url": "https://example.org/reserva"
    }
  ]
}
```

Campos de `links`:

- `label`: texto corto visible para identificar el enlace. Si se guarda vacío desde cliente, se usa la propia URL como etiqueta.
- `url`: URL externa completa. La UI solo acepta y muestra enlaces `http://` o `https://`.

Compatibilidad:

- Los planes antiguos sin `links` se interpretan como `links: []`.
- Los enlaces se guardan como una lista pequeña de objetos `{ label, url }`, sin crear subcolecciones para evitar complejidad innecesaria.
- En las vistas de lectura los enlaces externos se abren en una pestaña nueva con `rel="noopener noreferrer"`.

## Estructura recomendada para puntos de interés

Los puntos de interés guardan lugares importantes del viaje que deben aparecer en los mapas.

Documento por punto en `trips/{tripId}/pointsOfInterest/{pointId}`:

```json
{
  "name": "Mirador",
  "description": "Buena vista al atardecer",
  "type": "landmark",
  "icon": "view",
  "color": "#f59e0b",
  "isVisible": true,
  "locationName": "Mirador del río",
  "locationLat": 40.4168,
  "locationLng": -3.7038
}
```

Campos esperados:

- `name`: nombre visible del punto.
- `description`: nota opcional breve para recordar el contexto del lugar.
- `type`: tipo corto controlado por la UI, por ejemplo `restaurant`, `cafe`, `public_toilet` o `airport`.
- `icon`: identificador corto de icono controlado por la UI.
- `color`: color hexadecimal corto usado para diferenciar el marcador en el mapa.
- `isVisible`: booleano para decidir si ese punto debe aparecer o no en el mapa del viaje.
- `locationName`: etiqueta de localización seleccionada o marcada en el mapa.
- `locationLat` y `locationLng`: coordenadas numéricas obligatorias.

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

## Estructura recomendada para equipaje privado por persona

La lista de equipaje debe seguir la misma estructura que la checklist, pero en una colección separada donde cada documento pertenece a una persona del viaje.

Documento por ítem en `trips/{tripId}/luggageItems/{itemId}`:

```json
{
  "ownerId": "uid-del-usuario",
  "title": "Pasaporte",
  "status": "pending"
}
```

Campos esperados:

- `ownerId`: uid de la persona que ha creado el elemento.
- `title`: texto corto visible en la UI.
- `status`: `pending` o `completed`.
- `createdAt` y `updatedAt`: timestamps de servidor para trazabilidad.

Regla práctica:

- `luggageItems` solo debe ser accesible para miembros del viaje.
- Cada miembro solo puede leer, crear, modificar o eliminar documentos con `ownerId` igual a su uid.
- Las consultas de cliente deben filtrar por `ownerId` para que Firestore pueda validar la privacidad por documento.

## Reglas sugeridas de Firestore

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function signedEmail() {
      return signedIn() && request.auth.token.email != null
        ? lower(request.auth.token.email)
        : '';
    }

    function tripVisibleFromResource() {
      return signedIn() && request.auth.uid in resource.data.memberIds;
    }

    function tripVisibleFromTripData(tripData) {
      return signedIn() && request.auth.uid in tripData.memberIds;
    }

    function tripVisibleFromParent(tripId) {
      return tripVisibleFromTripData(
        get(/databases/$(database)/documents/trips/$(tripId)).data
      );
    }

    function inviteRecipient(tripId) {
      return signedIn() && exists(
        /databases/$(database)/documents/tripInvites/$(tripId + '_' + signedEmail())
      ) && get(
        /databases/$(database)/documents/tripInvites/$(tripId + '_' + signedEmail())
      ).data.status == 'pending';
    }

    match /users/{userId} {
      allow read, write: if signedIn() && request.auth.uid == userId;
    }

    match /trips/{tripId} {
      allow read: if tripVisibleFromResource();
      allow create: if signedIn() &&
        request.resource.data.ownerId == request.auth.uid &&
        tripVisibleFromTripData(request.resource.data);
      allow update: if tripVisibleFromResource() || inviteRecipient(tripId);

      match /members/{memberId} {
        allow read: if tripVisibleFromParent(tripId);
        allow create: if tripVisibleFromParent(tripId) || (
          inviteRecipient(tripId) &&
          memberId == request.auth.uid &&
          request.resource.data.userId == request.auth.uid &&
          lower(request.resource.data.email) == signedEmail()
        );
        allow update, delete: if tripVisibleFromParent(tripId);
      }

      match /plans/{planId} {
        allow read: if tripVisibleFromParent(tripId);
        allow write: if tripVisibleFromParent(tripId);
      }

      match /checklistItems/{checklistItemId} {
        allow read: if tripVisibleFromParent(tripId);
        allow write: if tripVisibleFromParent(tripId);
      }

      match /luggageItems/{luggageItemId} {
        allow read: if tripVisibleFromParent(tripId) &&
          resource.data.ownerId == request.auth.uid;
        allow create: if tripVisibleFromParent(tripId) &&
          request.resource.data.ownerId == request.auth.uid;
        allow update: if tripVisibleFromParent(tripId) &&
          resource.data.ownerId == request.auth.uid &&
          request.resource.data.ownerId == request.auth.uid;
        allow delete: if tripVisibleFromParent(tripId) &&
          resource.data.ownerId == request.auth.uid;
      }
    }

    match /tripInvites/{inviteId} {
      allow read: if signedIn() && (
        resource.data.ownerId == request.auth.uid ||
        signedEmail() == resource.data.emailLower
      );
      allow create: if signedIn() &&
        request.resource.data.ownerId == request.auth.uid &&
        request.resource.data.emailLower is string &&
        request.resource.data.status == 'pending';
      allow update: if signedIn() && (
        resource.data.ownerId == request.auth.uid ||
        signedEmail() == resource.data.emailLower
      );
    }
  }
}
```

Regla práctica:

- Para esta app, la fuente principal de acceso a un viaje es `memberIds`.
- El owner debe estar siempre incluido también en `memberIds`.
- Si la query del dashboard lista `trips` por `memberIds`, las reglas de lectura de `trips` deben depender solo de ese campo del propio documento.

## Flujo de invitaciones

1. La persona editora introduce un correo y un rol.
2. La app crea o reemplaza `tripInvites/{tripId_emailLower}` con `emailLower`, rol y metadatos del viaje, sin consultar `users` por correo.
3. El usuario invitado ve sus invitaciones pendientes filtrando por su propio email autenticado.
4. Al aceptar, la app crea `trips/{tripId}/members/{uid}`, añade el `uid` a `memberIds` y marca la invitación como aceptada.

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

## Limitación importante

GitHub Pages es estático, así que las vistas de detalle usan páginas estáticas con parámetros de búsqueda:

- `.../app/trip/?trip=ID`
- `.../app/plan/?trip=ID&plan=ID`
- `.../app/calendar/?trip=ID`

Así se conserva compatibilidad con dominio raíz, subrutas y despliegue estático sin SSR.
