-- Tarea 2: estructuras aditivas para registrar integraciones y revisión de IA.
-- Ejecutar una sola vez sobre la base de datos existente de Tarea 1.

ALTER TABLE eventos
  MODIFY tipo_evento ENUM(
    'product.viewed', 'cart.item_added', 'checkout.started',
    'order.created', 'payment.simulated', 'support.requested',
    'user.registered', 'user.logged_in', 'user.logged_out',
    'order.status_changed', 'stock.updated', 'incident.created',
    'agent.approved', 'workflow.error'
  ) NOT NULL;

CREATE TABLE IF NOT EXISTS integracion_ejecuciones (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id VARCHAR(120) NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id VARCHAR(120) NOT NULL,
  outcome ENUM('synced', 'failed', 'pending_review', 'approved', 'rejected') NOT NULL,
  summary VARCHAR(500) NOT NULL DEFAULT '',
  n8n_execution_id VARCHAR(120) DEFAULT NULL,
  payload_json LONGTEXT DEFAULT NULL,
  occurred_at DATETIME DEFAULT NULL,
  processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_integracion_evento (event_id),
  KEY idx_integracion_outcome (outcome),
  KEY idx_integracion_fecha (processed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS propuestas_agente (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_event_id VARCHAR(120) NOT NULL,
  incident_id INT UNSIGNED NOT NULL,
  case_type VARCHAR(80) NOT NULL,
  consulted_data_json LONGTEXT NOT NULL,
  proposed_action VARCHAR(120) NOT NULL,
  rationale TEXT NOT NULL,
  confidence DECIMAL(4,3) NOT NULL DEFAULT 0.000,
  priority ENUM('baja', 'media', 'alta', 'urgente') NOT NULL DEFAULT 'media',
  risks TEXT NOT NULL,
  status ENUM('pendiente_revision', 'aprobada', 'rechazada', 'ejecutada_simulada') NOT NULL DEFAULT 'pendiente_revision',
  review_note VARCHAR(500) DEFAULT NULL,
  reviewed_by INT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_propuesta_evento (source_event_id),
  KEY idx_propuesta_status (status),
  KEY idx_propuesta_incident (incident_id),
  CONSTRAINT fk_propuesta_incident FOREIGN KEY (incident_id) REFERENCES incidencias (id),
  CONSTRAINT fk_propuesta_reviewer FOREIGN KEY (reviewed_by) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
