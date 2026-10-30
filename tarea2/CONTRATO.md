# Contrato de integración Tarea 2

El canal envía un sobre JSON a un Webhook n8n protegido con una credencial Header Auth. Los identificadores de evento son estables y se almacenan con clave única para evitar duplicados al reintentar.

```json
{
  "eventId": "order:123:created",
  "type": "order.created",
  "occurredAt": "2026-10-20T10:15:00+02:00",
  "entity": { "type": "order", "id": "PF-2026-ABC123" },
  "data": {}
}
```

## Campos y validaciones

| Campo | Tipo | Regla |
| --- | --- | --- |
| `eventId` | string | Obligatorio; máximo 120 caracteres; clave de idempotencia |
| `type` | string | Lista permitida: `order.created`, `payment.simulated`, `order.status_changed`, `stock.updated`, `support.requested`, `incident.created`, `agent.approved` |
| `occurredAt` | ISO 8601 | Obligatorio; se normaliza a fecha y hora SQL |
| `entity.type` | string | `order`, `incident`, `product` o `agent` |
| `entity.id` | string | Identificador estable del objeto de origen |
| `data` | object | Datos mínimos requeridos para el evento; se valida en PHP y en el workflow |
| `outcome` | enum | Lo añade el workflow al registrar resultado: `synced`, `failed`, `pending_review`, `approved` o `rejected` |

El Webhook n8n y el endpoint PHP exigen `X-Integration-Token` por HTTPS. El mismo secreto aleatorio se configura como credencial Header Auth en n8n y en `api/config/config.php`; no se guarda en ejemplos ni en el repositorio.

## Eventos utilizados

- **Pedido:** `order.created` contiene usuario de prueba, líneas, totales, estado y fecha. El ID del evento identifica una única creación.
- **Cambio operativo:** `order.status_changed` contiene pedido, estado anterior, estado nuevo, actor administrativo y hora. El endpoint solo acepta los estados definidos por el proyecto.
- **Incidencia:** `support.requested` contiene ID de usuario de prueba, asunto y descripción. n8n consulta los detalles con una herramienta de solo lectura y crea una propuesta pendiente de revisión.
- **Aprobación:** `agent.approved` se genera desde el back-office tras una decisión expresa de un administrador. Solo entonces la rama de Telegram notifica al canal interno del equipo.

Ejemplos completos en `payloads/`. Todos los nombres, direcciones y casos de ejemplo deben ser ficticios.

