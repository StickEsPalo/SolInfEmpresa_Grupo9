const dashboardRefs = {
  message: document.querySelector("#dashboard-message"),
  metrics: document.querySelector("#metrics-grid"),
  chart: document.querySelector("#daily-orders-chart"),
  revenueChart: document.querySelector("#daily-revenue-chart"),
  incidentHoursChart: document.querySelector("#incident-hours-chart"),
  incidentDaysChart: document.querySelector("#incident-days-chart"),
  incidents: document.querySelector("#recent-incidents"),
  products: document.querySelector("#top-products"),
  runs: document.querySelector("#integration-runs"),
  orders: document.querySelector("#recent-orders"),
  proposals: document.querySelector("#agent-proposals"),
};
let dashboardCsrfToken = "";
const tablePages = { runs: 1, orders: 1, incidents: 1 };
const PAGE_SIZE = 5;

function pagedRows(rows, key) {
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  tablePages[key] = Math.min(tablePages[key], pages);
  const start = (tablePages[key] - 1) * PAGE_SIZE;
  return { page: tablePages[key], pages, rows: rows.slice(start, start + PAGE_SIZE) };
}

function paginationHtml(key, page, pages, count) {
  if (pages < 2) return "";
  const nums = Array.from({ length: pages }, (_, i) => `<button type="button" class="page-number${i + 1 === page ? " is-current" : ""}" data-page="${i + 1}" aria-label="Página ${i + 1}" ${i + 1 === page ? 'aria-current="page"' : ""}>${i + 1}</button>`).join("");
  return `<nav class="table-pagination" aria-label="Paginación"><span>${count} registros</span><div><button type="button" class="page-arrow" data-page="${page - 1}" aria-label="Página anterior" ${page <= 1 ? "disabled" : ""}>‹</button>${nums}<button type="button" class="page-arrow" data-page="${page + 1}" aria-label="Página siguiente" ${page >= pages ? "disabled" : ""}>›</button></div></nav>`;
}

function bindPagination(container, key, render) {
  container.querySelectorAll("[data-page]").forEach((button) => button.addEventListener("click", () => {
    tablePages[key] = Number(button.dataset.page); render();
  }));
}

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
    ["Importe simulado", formatCurrency(metrics.simulatedRevenue), "Pedidos con pago confirmado (excluye pendientes y cancelados)"],
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

function renderDailyRevenueChart(rows) {
  const normalized = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - (6 - index));
    const key = date.toLocaleDateString("sv-SE");
    const row = rows.find((item) => item.day === key);
    return { day: date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }), total: Number(row?.total || 0) };
  });
  const max = Math.max(1, ...normalized.map((row) => row.total));
  const bars = normalized.map((row, index) => {
    const x = 42 + index * 72, height = row.total ? Math.max(3, row.total / max * 112) : 2, y = 142 - height;
    return `<g><title>${escapeHtml(row.day)}: ${formatCurrency(row.total)} con pago confirmado</title><rect x="${x}" y="${y}" width="44" height="${height}" rx="7" fill="#9caf62"/><text x="${x + 22}" y="164" text-anchor="middle">${escapeHtml(row.day)}</text><text class="chart-value" x="${x + 22}" y="${Math.max(15,y-6)}" text-anchor="middle">${row.total ? escapeHtml(formatCurrency(row.total)) : "—"}</text></g>`;
  }).join("");
  dashboardRefs.revenueChart.innerHTML = `<svg viewBox="0 0 560 185" role="img" aria-label="Ingresos diarios de pedidos con pago confirmado durante los últimos siete días"><line x1="24" y1="142" x2="540" y2="142" stroke="#d7cdb7"/>${bars}</svg>`;
}

function renderProducts(rows) {
  if (!rows.length) { dashboardRefs.products.innerHTML = '<p class="empty-state">Todavía no hay líneas de pedido.</p>'; return; }
  dashboardRefs.products.innerHTML = `<table class="operations-table"><thead><tr><th>Producto</th><th>Unidades</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.quantity)}</td></tr>`).join("")}</tbody></table>`;
}

function renderRuns(rows) {
  if (!rows.length) { dashboardRefs.runs.innerHTML = '<p class="empty-state">Aún no hay ejecuciones. Activa el workflow y genera un pedido o una incidencia de prueba.</p>'; return; }
  const draw = () => { const p = pagedRows(rows, "runs"); dashboardRefs.runs.innerHTML = `<table class="operations-table"><thead><tr><th>Evento</th><th>Resultado</th><th>Hora</th></tr></thead><tbody>${p.rows.map((row) => `<tr><td>${escapeHtml(row.event_type)}<br><small>${escapeHtml(row.entity_type)} ${escapeHtml(row.entity_id)}</small></td><td class="status-${escapeHtml(row.outcome)}">${escapeHtml(row.outcome)}</td><td>${escapeHtml(row.processed_at)}</td></tr>`).join("")}</tbody></table>${paginationHtml("runs", p.page, p.pages, rows.length)}`; bindPagination(dashboardRefs.runs,"runs",draw); };
  draw();
}

function renderOrders(rows) {
  if (!rows.length) { dashboardRefs.orders.innerHTML = '<p class="empty-state">No hay pedidos que actualizar.</p>'; return; }
  const statuses = ["pendiente", "pagado", "preparando", "enviado", "entregado", "cancelado"];
  const draw = () => { const p = pagedRows(rows, "orders"); dashboardRefs.orders.innerHTML = `<table class="operations-table"><thead><tr><th>Pedido</th><th>Estado actual</th><th>Cambiar estado</th></tr></thead><tbody>${p.rows.map((order) => `<tr><td>${escapeHtml(order.codigo_pedido)}<br><small>${escapeHtml(formatCurrency(order.total))}</small></td><td>${escapeHtml(order.estado)}</td><td><form data-order-form="${Number(order.id)}"><select name="status" aria-label="Nuevo estado para ${escapeHtml(order.codigo_pedido)}">${statuses.map((status) => `<option value="${status}"${status === order.estado ? " selected" : ""}>${status}</option>`).join("")}</select> <button class="button button-dark" type="submit">Guardar</button></form></td></tr>`).join("")}</tbody></table>${paginationHtml("orders", p.page, p.pages, rows.length)}`;
  dashboardRefs.orders.querySelectorAll("[data-order-form]").forEach((form) => form.addEventListener("submit", updateOrderStatus));
  bindPagination(dashboardRefs.orders, "orders", draw); };
  draw();
}

function dateKeyLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hourKeyLocal(date) {
  return `${dateKeyLocal(date)} ${String(date.getHours()).padStart(2, "0")}:00:00`;
}

function parseServerDate(value) {
  // MySQL devuelve la fecha sin zona; se interpreta con la zona local del sitio.
  return new Date(String(value || "").replace(" ", "T"));
}

function renderIncidentHours(rows, serverNow) {
  const end = parseServerDate(serverNow);
  if (Number.isNaN(end.getTime())) {
    dashboardRefs.incidentHoursChart.innerHTML = '<p class="empty-state">No se pudo leer la fecha del servidor.</p>';
    return;
  }

  end.setMinutes(0, 0, 0);
  const normalized = [];
  for (let index = 23; index >= 0; index -= 1) {
    const hour = new Date(end);
    hour.setHours(hour.getHours() - index);
    const key = hourKeyLocal(hour);
    const row = rows.find((item) => item.hour === key);
    normalized.push({
      key,
      label: hour.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      total: Number(row?.total || 0),
    });
  }

  const max = Math.max(1, ...normalized.map((row) => row.total));
  const barWidth = 20;
  const gap = 15;
  const width = 48 + normalized.length * (barWidth + gap);
  const bars = normalized.map((row, index) => {
    const x = 30 + index * (barWidth + gap);
    const height = row.total === 0 ? 2 : (row.total / max) * 112;
    const y = 145 - height;
    const label = index % 4 === 0 ? row.label : "";
    return `<g><title>${escapeHtml(row.label)}: ${row.total} incidencias</title><rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="4" fill="#d65d43"/><text x="${x + barWidth / 2}" y="${Math.max(14, y - 6)}" text-anchor="middle">${row.total || ""}</text><text x="${x + barWidth / 2}" y="169" text-anchor="middle">${label}</text></g>`;
  }).join("");

  dashboardRefs.incidentHoursChart.innerHTML = `<svg viewBox="0 0 ${width} 190" role="img" aria-label="Incidencias por hora durante las últimas 24 horas"><line x1="20" y1="145" x2="${width - 12}" y2="145" stroke="#b9b09f"/>${bars}</svg>`;
}

function renderIncidentDays(rows, serverNow) {
  const end = parseServerDate(serverNow);
  if (Number.isNaN(end.getTime())) {
    dashboardRefs.incidentDaysChart.innerHTML = '<p class="empty-state">No se pudo leer la fecha del servidor.</p>';
    return;
  }

  end.setHours(12, 0, 0, 0);
  const normalized = [];
  for (let index = 6; index >= 0; index -= 1) {
    const day = new Date(end);
    day.setDate(day.getDate() - index);
    const key = dateKeyLocal(day);
    const row = rows.find((item) => item.day === key);
    normalized.push({
      day: day.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }),
      total: Number(row?.total || 0),
    });
  }

  const max = Math.max(1, ...normalized.map((row) => row.total));
  const bars = normalized.map((row, index) => {
    const barWidth = 48;
    const gap = 26;
    const x = 44 + index * (barWidth + gap);
    const height = row.total === 0 ? 2 : (row.total / max) * 128;
    const y = 160 - height;
    return `<g><title>${escapeHtml(row.day)}: ${row.total} incidencias</title><rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="5" fill="#d65d43"/><text x="${x + barWidth / 2}" y="${Math.max(16, y - 7)}" text-anchor="middle">${row.total || ""}</text><text x="${x + barWidth / 2}" y="184" text-anchor="middle">${escapeHtml(row.day)}</text></g>`;
  }).join("");
  dashboardRefs.incidentDaysChart.innerHTML = `<svg viewBox="0 0 560 205" role="img" aria-label="Incidencias por día durante los últimos siete días"><line x1="24" y1="160" x2="540" y2="160" stroke="#b9b09f"/>${bars}</svg>`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
}

function renderIncidents(rows) {
  if (!rows.length) {
    dashboardRefs.incidents.innerHTML = '<p class="empty-state">Todavía no hay incidencias registradas.</p>';
    return;
  }

  const p = pagedRows(rows, "incidents");
  const tableRows = p.rows.map((incident) => {
    const customer = `${incident.nombre || ""} ${incident.apellidos || ""}`.trim();
    const canResolve = ["abierta", "en_revision"].includes(incident.estado);
    const action = canResolve
      ? `<button class="button button-dark resolve-incident-button" type="button" data-resolve-incident="${Number(incident.id)}">Marcar resuelta</button>`
      : `<span class="incident-resolved-date">${escapeHtml(formatDateTime(incident.fecha_resolucion))}</span>`;

    return `<tr>
      <td><b>#${Number(incident.id)}</b><br><small>${escapeHtml(incident.prioridad || "media")}</small></td>
      <td><b>${escapeHtml(incident.asunto)}</b><br><small>${escapeHtml(incident.descripcion)}</small></td>
      <td>${escapeHtml(customer || incident.email)}<br><small>${escapeHtml(incident.email)}</small></td>
      <td><span class="incident-status status-${escapeHtml(incident.estado)}">${escapeHtml(incident.estado)}</span></td>
      <td>${escapeHtml(formatDateTime(incident.fecha_creacion))}</td>
      <td>${action}</td>
    </tr>`;
  }).join("");

  dashboardRefs.incidents.innerHTML = `<div class="table-scroll"><table class="operations-table incidents-table">
    <thead><tr><th>ID</th><th>Incidencia</th><th>Cliente</th><th>Estado</th><th>Creada</th><th>Acción / resolución</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table></div>${paginationHtml("incidents", p.page, p.pages, rows.length)}`;

  dashboardRefs.incidents.querySelectorAll("[data-resolve-incident]").forEach((button) => {
    button.addEventListener("click", resolveIncident);
  });
  bindPagination(dashboardRefs.incidents, "incidents", () => renderIncidents(rows));
}

function renderProposals(rows) {
  if (!rows.length) {
    dashboardRefs.proposals.innerHTML = '<p class="empty-state">No hay propuestas del agente. Las nuevas incidencias aparecerán aquí después de ejecutar n8n.</p>';
    return;
  }

  dashboardRefs.proposals.innerHTML = rows.map((proposal) => {
    const consulted = JSON.stringify(proposal.consultedData || {}, null, 2);
    const isPending = proposal.status === "pendiente_revision";
    return `<article class="proposal-card">
      <p class="eyebrow">${escapeHtml(proposal.case_type)} · ${escapeHtml(proposal.created_at)}</p>
      <h3>Incidencia ${escapeHtml(proposal.incident_id)}: ${escapeHtml(proposal.proposed_action)}</h3>
      <div class="proposal-facts">
        <div><b>Prioridad</b><br>${escapeHtml(proposal.priority)}</div>
        <div><b>Confianza</b><br>${Math.round(Number(proposal.confidence) * 100)}%</div>
        <div><b>Estado</b><br>${escapeHtml(proposal.status)}</div>
        <div class="proposal-consulted-data"><b>Datos consultados</b><pre><code>${escapeHtml(consulted)}</code></pre></div>
      </div>
      <p><b>Motivo:</b> ${escapeHtml(proposal.rationale)}</p>
      <p><b>Riesgos:</b> ${escapeHtml(proposal.risks)}</p>
      ${isPending
        ? `<form class="proposal-review-form" data-proposal-id="${Number(proposal.id)}">
            <label>Nota de revisión (opcional)<br><input class="proposal-note" name="note" maxlength="500"></label>
            <div class="proposal-actions">
              <button class="button button-dark" name="decision" value="approved" type="submit">Aprobar y notificar por Telegram</button>
              <button class="button" name="decision" value="rejected" type="submit">Rechazar propuesta</button>
            </div>
          </form>`
        : `<p><b>Nota:</b> ${escapeHtml(proposal.review_note || "Sin nota")}</p>`}
    </article>`;
  }).join("");

  dashboardRefs.proposals.querySelectorAll(".proposal-review-form").forEach((form) => {
    form.addEventListener("submit", reviewProposal);
  });
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

async function resolveIncident(event) {
  const button = event.currentTarget;
  const incidentId = Number(button.dataset.resolveIncident);
  if (!incidentId || button.disabled) return;

  const previousText = button.textContent;
  button.disabled = true;
  button.textContent = "Guardando…";

  try {
    const result = await dashboardRequest("../api/admin/resolve-incident.php", {
      method: "POST",
      body: JSON.stringify({ incidentId }),
    });
    await loadDashboard();
    showDashboardMessage(result.changed
      ? `La incidencia #${incidentId} se ha marcado como resuelta.`
      : `La incidencia #${incidentId} ya estaba resuelta.`);
  } catch (error) {
    button.disabled = false;
    button.textContent = previousText;
    showDashboardMessage(error.message, "error");
  }
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
    renderDailyRevenueChart(result.dailyRevenue || []);
    renderIncidentHours(result.incidentHours || [], result.serverNow);
    renderIncidentDays(result.incidentDays || [], result.serverNow);
    renderIncidents(result.recentIncidents || []);
    renderProducts(result.topProducts || []);
    renderRuns(result.integrationRuns || []);
    renderOrders(result.recentOrders || []);
    renderProposals(result.proposals || []);
    showDashboardMessage("Datos cargados desde la base de datos del proyecto.");
  } catch (error) {
    showDashboardMessage(error.message, "error");
  }
}

const loginRefs = {
  panel: document.querySelector("#login-panel"),
  form: document.querySelector("#dashboard-login-form"),
  error: document.querySelector("#dashboard-login-error"),
  content: document.querySelector("#dashboard-content"),
  refresh: document.querySelector("#refresh-dashboard"),
  logout: document.querySelector("#logout-dashboard"),
};

function showLoginOnly(message = "") {
  loginRefs.panel.hidden = false;
  loginRefs.content.hidden = true;
  loginRefs.refresh.hidden = true;
  loginRefs.logout.hidden = true;
  Object.values(dashboardRefs).forEach((node) => { if (node && node !== dashboardRefs.message) node.innerHTML = ""; });
  loginRefs.error.textContent = message;
  showDashboardMessage("Inicia sesión con una cuenta administradora para ver los datos.");
}

async function showDashboardContent() {
  loginRefs.panel.hidden = true;
  loginRefs.content.hidden = false;
  loginRefs.refresh.hidden = false;
  loginRefs.logout.hidden = false;
  await loadDashboard();
}

async function handleDashboardLogin(event) {
  event.preventDefault();
  loginRefs.error.textContent = "";
  const email = loginRefs.form.elements.email.value.trim();
  const password = loginRefs.form.elements.password.value;
  if (!email || !password) { loginRefs.error.textContent = "Introduce tu correo y tu contraseña."; return; }
  try {
    const result = await dashboardRequest("../api/auth/login.php", { method: "POST", body: JSON.stringify({ email, password }) });
    loginRefs.form.reset();
    if (result.user?.role !== "administrador") {
      await dashboardRequest("../api/auth/logout.php", { method: "POST", body: "{}" });
      showLoginOnly("Esta cuenta no tiene permisos de administración.");
      return;
    }
    await showDashboardContent();
  } catch (error) {
    loginRefs.form.elements.password.value = "";
    loginRefs.error.textContent = error.message;
  }
}

async function handleDashboardLogout() {
  try { await dashboardRequest("../api/auth/logout.php", { method: "POST", body: "{}" }); } catch (error) { /* la sesión se cierra igualmente en pantalla */ }
  showLoginOnly();
}

async function initializeDashboard() {
  try {
    const session = await dashboardRequest("../api/auth/session.php");
    dashboardCsrfToken = session.csrfToken || "";
    if (!session.authenticated || session.user?.role !== "administrador") {
      showLoginOnly();
      return;
    }
    await showDashboardContent();
  } catch (error) {
    showLoginOnly();
    showDashboardMessage(error.message, "error");
  }
}

loginRefs.form.addEventListener("submit", handleDashboardLogin);
loginRefs.logout.addEventListener("click", handleDashboardLogout);
document.querySelector("#refresh-dashboard").addEventListener("click", loadDashboard);
initializeDashboard();
