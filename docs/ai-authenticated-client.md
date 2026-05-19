# Cliente IA autenticado

Esta app usa un cliente IA autenticado desde navegador para generar sugerencias dentro de un viaje existente sin romper el despliegue estático.

## Ficheros base esperados

La integración debe conservar estos módulos en `src/lib/ai/`:

- `authenticated-api-client.ts`
- `errors.ts`
- `json.ts`

## Patrón obligatorio

Cuando una funcionalidad nueva necesite IA autenticada:

1. Obtener el usuario autenticado de Firebase.
2. Pedir el token con `firebaseUser.getIdToken()`.
3. Enviar `projectId`, `systemPrompt`, `userPrompt` y un validador estricto de JSON.
4. Validar antes de mostrar o guardar datos generados.
5. Manejar errores de configuración, autenticación, red, timeout y respuesta inválida.

## Módulo de referencia en este proyecto

La generación de sugerencias de planes usa:

- `src/lib/ai/trip-plan-suggestions.ts`
- `src/lib/app/trip-plan-suggestions.ts`

Ese flujo:

- construye prompts acotados al viaje;
- llama a `generateAuthenticatedAiApiJson(...)`;
- valida el JSON con `zod`;
- filtra duplicados y conflictos con planes existentes;
- convierte cada sugerencia aceptada al modelo normal `PlanInput`.

## Reglas prácticas

- No confiar en texto libre de IA sin validar.
- No guardar coordenadas parciales.
- No aceptar fechas fuera del rango del viaje.
- No aceptar categorías que no existan en `src/lib/app/models.ts`.
- Mantener la UI preparada para estados de carga, vacío, error y descarte.
