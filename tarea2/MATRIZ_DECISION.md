# Matriz de decisión tecnológica

Escala 1 (débil) a 5 (fuerte). Los pesos reflejan las necesidades del prototipo académico que ya dispone de un canal propio; las puntuaciones son estimaciones del equipo y se deben ajustar con datos reales de proveedores.

| Criterio | Peso | PHP propio + n8n | SaaS no-code | ERP/CRM configurable |
| --- | ---: | ---: | ---: | ---: |
| Funcionalidad para el caso | 15% | 4 | 3 | 5 |
| Coste inicial estimado | 10% | 4 | 3 | 2 |
| Esfuerzo de implantación | 10% | 3 | 5 | 2 |
| Escalabilidad | 10% | 4 | 3 | 5 |
| Integración con el proyecto actual | 12% | 5 | 3 | 4 |
| Seguridad y control de datos | 12% | 4 | 2 | 4 |
| Dependencia del proveedor | 7% | 4 | 1 | 2 |
| Mantenimiento | 7% | 3 | 4 | 2 |
| Trazabilidad y supervisión | 10% | 5 | 3 | 4 |
| Adecuación a empresa pequeña | 7% | 4 | 4 | 2 |
| **Puntuación ponderada / 5** | **100%** | **4,05** | **3,08** | **3,43** |

Fórmula: `sum(peso porcentual × puntuación) / 100`. Se recomienda PHP + MySQL + n8n para este prototipo porque integra código existente con automatizaciones programables, registro de ejecuciones y revisión humana. La recomendación es provisional: para producción se deberían verificar licencias, alojamiento, soporte, seguridad y coste total de propiedad.
