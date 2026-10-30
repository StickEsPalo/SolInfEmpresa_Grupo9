const dashboardRefs = {
  message: document.querySelector("#dashboard-message"),
  metrics: document.querySelector("#metrics-grid"),
  chart: document.querySelector("#daily-orders-chart"),
  products: document.querySelector("#top-products"),
  runs: document.querySelector("#integration-runs"),
  orders: document.querySelector("#recent-orders"),
  proposals: document.querySelector("#agent-proposals"),
};
let dashboardCsrfToken = "";

function escapeHtml(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(value ?? "").replace(/[&<>"']/g, (character) => entities[character]);
}

function showDashboardMessage(message, kind = "info") {
  dashboardRefs.message.textContent = message;
  dashboardRefs.message.dataset.kind = kind;
}

async function dashboardRequest(url, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (options.method && options.method !== "GET") {
    headers.set("Content-Type", "application/json");
    if (dashboardCsrfToken) headers.set("X-CSRF-Token", dashboardCsrfToken);
  }
  const response = await fetch(url, { ...options, headers, credentials: "same-origin", cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (body.csrfToken) dashboardCsrfToken = body.csrfToken;
  if (!response.ok) throw new Error(body.error || `Error HTTP ${response.status}`);
  return body;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(value || 0));
}

function renderMetrics(metrics) {
  const cards = [
    ["Pedidos registrados", metrics.orders, "Pedidos guardados en el sistema"],
    ["Importe simulado", formatCurrency(metrics.simulatedRevenue), "Suma de los totales de pedido"],
    ["Incidencias abiertas", metrics.openIncidents, "Estados abierta o en revisión"],
    ["Integraciones correctas", metrics.successfulIntegrations, "Ejecuciones sincronizadas"],
    ["Integraciones fallidas", metrics.failedIntegrations, "Errores guardados por el workflow"],
    ["Conversión checkout → pedido", metrics.conversionRate == null ? "Sin datos" : `${metrics.conversionRate}%`, "Pedidos creados / checkouts iniciados"],
    ["Resolución media", metrics.averageResolutionHours == null ? "Sin datos" : `${metrics.averageResolutionHours} h`, "Solo incidencias con fecha de resolución"],
    ["Revisión humana pendiente", metrics.pendingAgentReviews, "Propuestas del agente aún sin decisión"],
    ["Acciones aprobadas", metrics.approvedAgentActions, "Aprobaciones registradas por administradores"],
  ];
  dashboardRefs.metrics.innerHTML = cards.map(([label, value, help]) => `
    <article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(help)}</small></article>
  `).join("");
}

function renderDailyChart(rows) {
  const normalized = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toLocaleDateString("sv-SE");
    const row = rows.find((item) => item.day === key);
    return { day: date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }), total: Number(row?.total || 0) };
  });
  const max = Math.max(1, ...normalized.map((row) => row.total));
  const bars = normalized.map((row, index) => {
    const barWidth = 48;
    const gap = 26;
    const x = 44 + index * (barWidth + gap);
    const height = Math.max(2, (row.total / max) * 128);
    const y = 160 - height;
    return `<g><title>${escapeHtml(row.day)}: ${row.total} pedidos</title><rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="5" fill="#d65d43"/><text x="${x + barWidth / 2}" y="184" text-anchor="middle">${escapeHtml(row.day)}</text><text x="${x + barWidth / 2}" y="${Math.max(16, y - 7)}" text-anchor="middle">${row.total}</text></g>`;
  }).join("");
  dashboardRefs.chart.innerHTML = `<svg viewBox="0 0 560 205" role="img" aria-label="Pedidos por día en los últimos siete días"><line x1="24" y1="160" x2="540" y2="160" stroke="#b9b09f"/>${bars}</svg>`;
}

function renderProducts(rows) {
  if (!rows.length) { dashboardRefs.products.innerHTML = '<p class="empty-state">Todavía no hay líneas de pedido.</p>'; return; }
  dashboardRefs.products.innerHTML = `<table class="operations-table"><thead><tr><th>Producto</th><th>Unidades</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.quantity)}</td></tr>`).join("")}</tbody></table>`;
}

function renderRuns(rows) {
  if (!rows.length) { dashboardRefs.runs.innerHTML = '<p class="empty-state">Aún no hay ejecuciones. Activa el workflow y genera un pedido o una incidencia de prueba.</p>'; return; }
  dashboardRefs.runs.innerHTML = `<table class="operations-table"><thead><tr><th>Evento</th><th>Resultado</th><th>Hora</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.event_type)}<br><small>${escapeHtml(row.entity_type)} ${escapeHtml(row.entity_id)}</small></td><td class="status-${escapeHtml(row.outcome)}">${escapeHtml(row.outcome)}</td><td>${escapeHtml(row.processed_at)}</td></tr>`).join("")}</tbody></table>`;
}

function renderOrders(rows) {
  if (!rows.length) { dashboardRefs.orders.innerHTML = '<p class="empty-state">No hay pedidos que actualizar.</p>'; return; }
  const statuses = ["pendiente", "pagado", "preparando", "enviado", "entregado", "cancelado"];
  dashboardRefs.orders.innerHTML = `<table class="operations-table"><thead><tr><th>Pedido</th><th>Estado actual</th><th>Cambiar estado</th></tr></thead><tbody>${rows.map((order) => `<tr><td>${escapeHtml(order.codigo_pedido)}<br><small>${escapeHtml(formatCurrency(order.total))}</small></td><td>${escapeHtml(order.estado)}</td><td><form data-order-form="${Number(order.id)}"><select name="status" aria-label="Nuevo estado para ${escapeHtml(order.codigo_pedido)}">${statuses.map((status) => `<option value="${status}"${status === order.estado ? " selected" : ""}>${status}</option>`).join("")}</select> <button class="button button-dark" type="submit">Guardar</button></form></td></tr>`).join("")}</tbody></table>`;
  dashboardRefs.orders.querySelectorAll("[data-order-form]").forEach((form) => form.addEventListener("submit", updateOrderStatus));
}

function renderProposals(rows) {
  if (!rows.length) { dashboardRefs.proposals.innerHTML = '<p class="empty-state">No hay propuestas del agente. Las nuevas incidencias aparecerán aquí después de ejecutar n8n.</p>'; return; }
  dashboardRefs.proposals.innerHTML = rows.map((proposal) => {
    const consulted = JSON.stringify(proposal.consultedData || {});
    const isPending = proposal.status === "pendiente_revision";
    return `<article class="proposal-card"><p class="eyebrow">${escapeHtml(proposal.case_type)} · ${escapeHtml(proposal.created_at)}</p><h3>Incidencia ${escapeHtml(proposal.incident_id)}: ${escapeHtml(proposal.proposed_action)}</h3><div class="proposal-facts"><div><b>Prioridad</b><br>${escapeHtml(proposal.priority)}</div><div><b>Confianza</b><br>${Math.round(Number(proposal.confidence) * 100)}%</div><div><b>Estado</b><br>${escapeHtml(proposal.status)}</div><div><b>Datos consultados</b><br><code>${escapeHtml(consulted)}</code></div></div><p><b>Motivo:</b> ${escapeHtml(proposal.rationale)}</p><p><b>Riesgos:</b> ${escapeHtml(proposal.risks)}</p>${isPending ? `<form class="proposal-review-form" data-proposal-id="${Number(proposal.id)}"><label>Nota de revisión (opcional)<br><input class="proposal-note" name="note" maxlength="500"></label><div class="proposal-actions"><button class="button button-dark" name="decision" value="approved" type="submit">Aprobar y notificar por Telegram</button><button class="button" name="decision" value="rejected" type="submit">Rechazar propuesta</button></div></form>` : `<p><b>Nota:</b> ${escapeHtml(proposal.review_note || "Sin nota")}</p>`}</article>`;
  }).join("");
  dashboardRefs.proposals.querySelectorAll(".proposal-review-form").forEach((form) => form.addEventListener("submit", reviewProposal));
}

async function updateOrderStatus(event) {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    await dashboardRequest("../api/admin/update-order-status.php", {
      method: "POST",
      body: JSON.stringify({ orderId: Number(form.dataset.orderForm), status: form.elements.status.value }),
    });
    showDashboardMessage("Estado actualizado. Si n8n está activo, el cambio se enviará al workflow.");
    await loadDashboard();
  } catch (error) { showDashboardMessage(error.message, "error"); }
}

async function reviewProposal(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitter = event.submitter;
  try {
    await dashboardRequest("../api/admin/agent-review.php", {
      method: "POST",
      body: JSON.stringify({
        proposalId: Number(form.dataset.proposalId),
        decision: submitter.value,
        note: form.elements.note.value.trim(),
      }),
    });
    showDashboardMessage(submitter.value === "approved" ? "Aprobación guardada. La notificación de Telegram se enviará solo si n8n está activo y configurado." : "Rechazo guardado en el historial.");
    await loadDashboard();
  } catch (error) { showDashboardMessage(error.message, "error"); }
}

async function loadDashboard() {
  showDashboardMessage("Cargando indicadores…");
  try {
    const result = await dashboardRequest("../api/admin/operations.php");
    renderMetrics(result.metrics);
    renderDailyChart(result.dailyOrders || []);
    renderProducts(result.topProducts || []);
    renderRuns(result.integrationRuns || []);
    renderOrders(result.recentOrders || []);
    renderProposals(result.proposals || []);
    showDashboardMessage("Datos cargados desde la base de datos del proyecto.");
  } catch (error) {
    showDashboardMessage(error.message, "error");
  }
}

async function initializeDashboard() {
  try {
    const session = await dashboardRequest("../api/auth/session.php");
    dashboardCsrfToken = session.csrfToken || "";
    if (!session.authenticated || session.user?.role !== "administrador") {
      showDashboardMessage("Inicia sesión con una cuenta administradora para ver estos datos.", "error");
      return;
    }
    await loadDashboard();
  } catch (error) {
    showDashboardMessage(error.message, "error");
  }
}

document.querySelector("#refresh-dashboard").addEventListener("click", loadDashboard);
initializeDashboard();
