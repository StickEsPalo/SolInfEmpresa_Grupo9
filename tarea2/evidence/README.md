# Evidencias de ejecución

Capturas y exportaciones reales de n8n y del back-office generadas durante las pruebas de la Tarea 2 (2 de noviembre de 2026). Todos los datos son ficticios: usuarios de prueba, pedidos simulados e incidencias escritas para la demostración.

No se incluyen tokens, claves, secretos de integración, el identificador del chat de Telegram, correos personales, direcciones ni información real de clientes. Antes de añadir una captura nueva, comprobar que no muestra la cabecera `headers` del nodo Webhook, ventanas de credenciales ni valores de variables.

La instancia de n8n Cloud usada es una prueba de 14 días, por lo que estas capturas son el registro de lo ejecutado.

## Back-office antes y después de la integración

| Archivo | Qué demuestra |
| --- | --- |
| `01_cuadro_ANTES_sin_ejecuciones.pdf` | Cuadro operativo antes de integrar: 0 integraciones y "Aún no hay ejecuciones". |
| `05_cuadro_DESPUES_order_created_synced.pdf` | Después: fila `order.created · synced` y una integración correcta. |

## Escenario 1: pedido integrado

| Archivo | Qué demuestra |
| --- | --- |
| `02_pedido_confirmado_web.png` | Pedido real confirmado en la web (guardado antes de avisar a n8n). |
| `03_n8n_ejecucion1_error_SSL.png` | Ejecución #1 en error: el nodo "Integrar pedido o pago" rechazó el certificado (URL sin `www`). |
| `04_n8n_ejecucion2_reintento_correcto.png` | Ejecución #2: reintento del mismo evento, correcto. Demuestra la idempotencia por `eventId`. |

## Escenario 2: cambio operativo

| Archivo | Qué demuestra |
| --- | --- |
| `06_n8n_ejecucion3_cambio_estado.png` | Ejecución #3: cambio de estado de pedido por la rama `cambio_operativo`. |

## Escenario 3: incidencia, agentes y supervisión humana

| Archivo | Qué demuestra |
| --- | --- |
| `07_n8n_ejecucion4_prueba_telegram.png` | Ejecución #4: evento de prueba por la rama `aprobacion` hasta Telegram. |
| `08_n8n_ejecucion7_herramienta_propuesta_con_error.png` | Fallo de la herramienta de guardar propuesta (422 del contrato), antes de normalizarla. |
| `09_n8n_ejecucion8_agente_propuesta_correcta.png` | Ejecución #8: el agente consulta y registra la propuesta. |
| `10_cuadro_propuesta_pendiente_incidencia11.pdf` | Salida estructurada: tipo, datos consultados, acción, confianza, prioridad, riesgos y estado `pendiente_revision`. |
| `11_n8n_ejecucion9_aprobacion_telegram.png` | Ejecución #9: tras aprobar, el flujo notifica al grupo interno. |
| `12_cuadro_tras_APROBAR.pdf` | Propuesta aprobada, "Acciones aprobadas: 1" y fila `agent.approved`. |
| `13_n8n_ejecucion10_incidencia12.png` | Ejecución #10: segunda incidencia procesada por el agente. |
| `14_cuadro_tras_RECHAZAR.pdf` | Propuesta rechazada con nota y fila `agent.rejected` (sin aviso a nadie). |
| `18_n8n_ejecucion15_dos_agentes_3min.png` | Primera ejecución con dos agentes en jerarquía (Analista y Revisor): 3 min por el límite del modelo. |
| `19_n8n_ejecucion20_dos_agentes_correcto.png` | Ejecución #20: dos agentes con Gemini 3.5 Flash Lite, 47 s. |
| `20_cuadro_propuesta_incidencia14_cupon.pdf` | Propuesta de la incidencia 14 (problema con cupón). |
| `21_cuadro_propuesta_incidencia16_direccion.pdf` | Propuesta de la incidencia 16 con intervención del Revisor (`[Revisor]`). |

## Gestión de errores

| Archivo | Qué demuestra |
| --- | --- |
| `15_n8n_ejecucion11_error_validar_contrato.png` | Evento sin `eventId`: falla "Validar contrato" (rama de error). |
| `16_cuadro_error_registrado_workflow_error.pdf` | El fallo queda registrado: `workflow.error · failed` e "Integraciones fallidas: 1". |
| `17_n8n_ejecucion18_error_503_modelo.png` | Error 503 del proveedor de IA (modelo saturado) y su recuperación al cambiar de modelo. |
| `22_limites_gemini_1.png`, `_2`, `_3` | Límites del plan gratuito de Gemini que explican los errores 429 y las esperas. |

## Pendientes de añadir

| Archivo | Qué demuestra |
| --- | --- |
| `23_log_agente_analista.png` | Panel Logs de n8n: qué consulta el Analista (solo lectura) y qué devuelve. |
| `24_log_agente_revisor.png` | Panel Logs: qué consulta y qué guarda el Revisor. |
| `25_telegram_mensaje.png` | Mensaje del bot en el grupo interno tras aprobar. |
| `26_incidencia_registrada_web.png` | Confirmación "Incidencia INC-… registrada" en la web. |
