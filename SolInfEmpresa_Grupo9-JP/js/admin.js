function renderAdmin() {
  const revenue = state.orders.reduce((sum, order) => sum + order.totals.total, 0);
  document.querySelector("#admin-stats").innerHTML = [
    ["Pedidos", state.orders.length], ["Facturación simulada", formatPrice(revenue)], ["Eventos", state.events.length], ["Soporte", state.tickets.length]
  ].map(([label, value]) => `<div class="admin-stat"><span>${label}</span><b>${value}</b></div>`).join("");

  document.querySelector("#admin-orders").innerHTML = state.orders.length ? `<table class="orders-table"><thead><tr><th>Pedido</th><th>Fecha</th><th>Cliente de prueba</th><th>Importe</th><th>Pago</th><th>Estado</th></tr></thead><tbody>${state.orders.map(order => `<tr><td><b>${safeText(order.id)}</b><br /><small>${order.items.map(item => `${item.quantity}× ${safeText(item.title)}`).join(", ")}</small></td><td>${new Date(order.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</td><td>${safeText(order.customer.name)}<br /><small>${safeText(order.customer.email)}</small></td><td>${formatPrice(order.totals.total)}</td><td>${safeText(order.payment.method)}<br /><small>${safeText(order.payment.reference)}</small></td><td><span class="status-chip">${safeText(order.status)}</span><br /><small>Creado → Pago simulado → Preparación</small></td></tr>`).join("")}</tbody></table>` : `<p class="empty-admin">Todavía no hay pedidos. Completa el checkout para generar una evidencia persistida.</p>`;

  document.querySelector("#admin-events").innerHTML = `<div class="admin-actions"><button type="button" data-action="export-events">Exportar JSON</button><button type="button" data-action="clear-events">Limpiar registros</button></div>${state.events.length ? `<table class="events-table"><thead><tr><th>Hora</th><th>Evento de negocio</th><th>Origen</th><th>Payload</th></tr></thead><tbody>${state.events.map(event => `<tr><td>${new Date(event.occurredAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "medium" })}</td><td><b>${safeText(event.type)}</b></td><td>${safeText(event.source)}</td><td><code>${safeText(JSON.stringify(event.payload))}</code></td></tr>`).join("")}</tbody></table>` : `<p class="empty-admin">Aún no hay eventos registrados.</p>`}`;

  document.querySelector("#admin-model").innerHTML = `<div class="model-grid">
    <article class="model-card"><h3>Producto</h3><p>id · title · category · players · difficulty · price · origin · author · mechanics</p></article>
    <article class="model-card"><h3>Pedido</h3><p>id · createdAt · customer · items[] · totals · status · promoCode</p></article>
    <article class="model-card"><h3>Línea de pedido</h3><p>productId · title · unitPrice · quantity</p></article>
    <article class="model-card"><h3>Pago simulado</h3><p>method · status · reference · asociado a un pedido</p></article>
    <article class="model-card"><h3>Evento</h3><p>id · type · occurredAt · source · payload</p></article>
    <article class="model-card"><h3>Soporte</h3><p>id · createdAt · email de prueba · message · status</p></article>
  </div>`;
}

function openAdmin() {
  renderAdmin();
  refs.adminDialog.showModal();
}

function selectAdminTab(tab) {
  document
    .querySelectorAll("[data-admin-tab]")
    .forEach(button => button.classList.toggle(
        "is-active",
        button.dataset.adminTab === tab
      )
    );

  ["orders", "events", "model"]
    .forEach(name => document
        .querySelector(`#admin-${name}`)
        .hidden = name !== tab
    );
}