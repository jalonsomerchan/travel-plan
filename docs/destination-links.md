# Enlaces utiles del destino

Los enlaces utiles del destino guardan recursos generales de un viaje que no pertenecen a un plan concreto: transporte publico, oficina de turismo, emergencias, aeropuertos, mapas oficiales o normas locales.

## Modelo de datos

Se almacenan en el campo `destinationLinks` del documento `trips/{tripId}` como una lista pequena de objetos:

```json
{
  "destinationLinks": [
    {
      "id": "destination-link-id",
      "title": "Transporte publico",
      "url": "https://example.org/transport",
      "category": "Transporte",
      "notes": "Compra billetes antes de subir."
    }
  ]
}
```

Campos:

- `id`: identificador estable del enlace dentro de la lista.
- `title`: texto visible obligatorio.
- `url`: URL externa obligatoria. La UI solo acepta `http://` y `https://`.
- `category`: texto opcional para agrupar visualmente los enlaces.
- `notes`: nota corta opcional limitada desde UI.

## Decision tecnica

La issue proponia una subcoleccion `trips/{tripId}/destinationLinks/{linkId}` como posible estructura. Se usa un campo pequeno en el documento del viaje porque:

- mantiene compatibilidad con viajes existentes sin migracion; si el campo no existe, se interpreta como lista vacia;
- reutiliza los permisos de actualizacion ya existentes del viaje sin introducir reglas nuevas;
- evita lecturas adicionales por enlace para una coleccion que normalmente sera pequena;
- mantiene la seccion separada de los enlaces de planes, POIs, checklist, equipaje y documentos.

Si la lista crece mucho en el futuro, se puede migrar a subcoleccion manteniendo los mismos campos.

## UI y seguridad

La pagina del viaje muestra una seccion independiente de enlaces utiles, agrupada por categoria cuando existe. Los enlaces se abren en una pestana nueva con `rel="noopener noreferrer"`. Los controles de crear, editar y eliminar solo se muestran a la persona propietaria o a miembros con rol `editor`.
