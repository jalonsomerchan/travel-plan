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

## Colecciones usadas

- `users/{uid}`: perfil básico del usuario autenticado. Solo puede leerlo o escribirlo el propio usuario.
- `trips/{tripId}`: viaje principal con fechas, estado, dueño y `memberIds`.
- `trips/{tripId}/members/{uid}`: permisos de cada usuario invitado.
- `trips/{tripId}/plans/{planId}`: planes del viaje.
- `tripInvites/{tripId_emailLower}`: invitaciones pendientes por correo. El cliente no consulta `users` para saber si ese correo tiene cuenta; al aceptar, se asigna el `userId` del usuario autenticado.

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

    function tripMember(tripId) {
      return signedIn() && (
        get(/databases/$(database)/documents/trips/$(tripId)).data.ownerId == request.auth.uid ||
        exists(/databases/$(database)/documents/trips/$(tripId)/members/$(request.auth.uid))
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
      allow read: if tripMember(tripId);
      allow create: if signedIn() && request.resource.data.ownerId == request.auth.uid;
      allow update: if tripMember(tripId) || inviteRecipient(tripId);

      match /members/{memberId} {
        allow read: if tripMember(tripId);
        allow create: if tripMember(tripId) || (
          inviteRecipient(tripId) &&
          memberId == request.auth.uid &&
          request.resource.data.userId == request.auth.uid &&
          lower(request.resource.data.email) == signedEmail()
        );
        allow update, delete: if tripMember(tripId);
      }

      match /plans/{planId} {
        allow read: if tripMember(tripId);
        allow write: if tripMember(tripId);
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
