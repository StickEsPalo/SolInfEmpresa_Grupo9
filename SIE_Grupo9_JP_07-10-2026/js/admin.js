async function renderAdmin() {
  if (!isAdmin()) return;

  const statsElement = document.querySelector("#admin-stats");
  const ordersElement = document.querySelector("#admin-orders");
  const eventsElement = document.querySelector("#admin-events");

  statsElement.innerHTML = `
    <div class="admin-stat"><span>Cargando…</span><b>…</b></div>
  `;

  try {
    const [ordersResponse, eventsResponse] = await Promise.all([
      apiRequest("./api/admin/orders.php"),
      apiRequest("./api/admin/events.php"),
    ]);
    const orders = ordersResponse.orders || [];
    const events = eventsResponse.events || [];
    const revenue = Number(ordersResponse.stats?.revenue || 0);
    const userCount = new Set(orders.map((order) => order.userId)).size;
    const statistics = [
      ["Pedidos", orders.length],
      ["Facturación simulada", formatPrice(revenue)],
      ["Eventos", events.length],
      ["Usuarios", userCount],
    ];

    statsElement.innerHTML = statistics
      .map(
        ([label, value]) => `
          <div class="admin-stat">
            <span>${label}</span>
            <b>${value}</b>
          </div>
        `,
      )
      .join("");

    ordersElement.innerHTML = orders.length
      ? renderAdminOrders(orders)
      : '<p class="empty-admin">Todavía no hay pedidos.</p>';
    eventsElement.innerHTML = events.length
      ? renderAdminEvents(events)
      : '<p class="empty-admin">No hay eventos.</p>';
    renderAdminDataModel();
  } catch (error) {
    const message = error.message || "No se pudo cargar el back-office.";
    ordersElement.innerHTML = `<p class="form-error">${safeText(message)}</p>`;
    eventsElement.innerHTML = "";
  }
}

function renderAdminOrders(orders) {
  const rows = orders
    .map((order) => {
      const products = (order.items || [])
        .map((item) => `${item.quantity}× ${safeText(item.title)}`)
        .join(", ");
      const date = new Date(order.createdAt).toLocaleString("es-ES", {
        dateStyle: "short",
        timeStyle: "short",
      });

      return `
        <tr>
          <td><b>${safeText(order.id)}</b><br /><small>${products}</small></td>
          <td>${date}</td>
          <td>
            <b>${safeText(order.userName)}</b><br />
            <small>${safeText(order.userEmail)}</small><br />
            <small>ID ${safeText(order.userId)}</small>
          </td>
          <td>
            ${safeText(order.customer.address)}<br />
            <small>
              ${safeText(order.customer.postalCode)} · ${safeText(order.customer.city)}
            </small>
          </td>
          <td>${formatPrice(order.totals.total)}</td>
          <td>
            ${safeText(order.payment.method)}<br />
            <small>${safeText(order.payment.reference)}</small>
          </td>
          <td>
            <span class="status-chip">
              ${safeText(orderStatusLabel(order.status))}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <table class="orders-table">
      <thead>
        <tr>
          <th>Pedido</th><th>Fecha</th><th>Usuario</th><th>Entrega</th>
          <th>Importe</th><th>Pago</th><th>Estado</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderAdminEvents(events) {
  const rows = events
    .map((event) => {
      const timestamp = event.fecha_evento || event.occurredAt;
      const eventType = event.tipo_evento || event.type;
      const details = event.datos || JSON.stringify(event.payload || {});

      return `
        <tr>
          <td>${new Date(timestamp).toLocaleString("es-ES")}</td>
          <td><b>${safeText(eventType)}</b></td>
          <td>${safeText(event.usuario_id ?? "")}</td>
          <td>${safeText(event.producto_id ?? "")}</td>
          <td>${safeText(event.pedido_id ?? "")}</td>
          <td><code>${safeText(details)}</code></td>
        </tr>
      `;
    })
    .join("");

  return `
    <table class="events-table">
      <thead>
        <tr>
          <th>Hora</th><th>Evento</th><th>Usuario</th>
          <th>Producto</th><th>Pedido</th><th>Datos</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderAdminDataModel() {
  const sections = [
    ["Usuarios", "id · nombre · apellidos · email · rol"],
    ["Productos", "catálogo y stock procedentes de MySQL"],
    ["Pedidos", "usuario · líneas · dirección · totales · estado"],
    ["Pagos simulados", "método · estado · referencia"],
    ["Eventos", "trazabilidad persistida en base de datos"],
    ["Incidencias", "soporte asociado al usuario conectado"],
  ];

  document.querySelector("#admin-model").innerHTML = `
    <div class="model-grid">
      ${sections
        .map(
          ([title, description]) => `
            <article class="model-card">
              <h3>${title}</h3>
              <p>${description}</p>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function openAdmin() {
  if (!isAdmin()) {
    promptAuth("El back-office está reservado a las cuentas de administrador.");
    return;
  }

  renderAdmin();
  refs.adminDialog.showModal();
}

function selectAdminTab(tab) {
  if (!isAdmin()) return;

  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.adminTab === tab);
  });

  ["orders", "events", "model"].forEach((name) => {
    document.querySelector(`#admin-${name}`).hidden = name !== tab;
  });
}
